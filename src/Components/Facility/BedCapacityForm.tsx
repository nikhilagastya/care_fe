import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { useDispatch } from "react-redux";
import { Grid, InputLabel, Select, Card, CardActions, CardHeader, CardContent, MenuItem, Button } from '@material-ui/core';
import { ErrorHelperText, NativeSelectField, TextInputField } from "../Common/HelperInputFields";
import SaveIcon from '@material-ui/icons/Save';
import { navigate } from 'hookrouter';
import { BED_TYPES } from "./constants";
import { CapacityModal, OptionsType } from './models';
import AppMessage from "../Common/AppMessage";
import { Loading } from "../../Components/Common/Loading";
import { createCapacity, getCapacity, listCapacity } from "../../Redux/actions";

interface BedCapacityProps extends CapacityModal {
    facilityId: number;
}

const initBedTypes: Array<OptionsType> = [{
    id: 0,
    text: 'Select',
}, ...BED_TYPES];

const initForm: any = {
    bedType: "",
    totalCapacity: "",
    currentOccupancy: ""
};

const initialState = {
    form: { ...initForm },
    errors: { ...initForm },
};

const bedCountReducer = (state = initialState, action: any) => {
    switch (action.type) {
        case "set_form": {
            return {
                ...state,
                form: action.form
            }
        }
        case "set_error": {
            return {
                ...state,
                errors: action.errors
            }
        }
        default:
            return state
    }
};

export const BedCapacityForm = (props: BedCapacityProps) => {
    const dispatchAction: any = useDispatch();
    const { facilityId, id } = props;
    const [state, dispatch] = useReducer(bedCountReducer, initialState);
    const [showAppMessage, setAppMessage] = useState({ show: false, message: "", type: "" });
    const [isLastOptionType, setIsLastOptionType] = useState(false);
    const [bedTypes, setBedTypes] = useState<Array<OptionsType>>(initBedTypes);
    const [isLoading, setIsLoading] = useState(false);

    const headerText = !id ? "Add Bed Capacity" : "Edit Bed Capacity";
    const buttonText = !id ? `Save ${!isLastOptionType ? "& Add More" : ""}` : "Update";

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        if (!id) {
            // Add Form functionality
            const capacityRes = await dispatchAction(listCapacity({}, { facilityId }));
            if (capacityRes && capacityRes.data) {
                const existingData = capacityRes.data.results;
                // redirect to listing page if all options are diabled
                if (existingData.length === BED_TYPES.length) {
                    navigate(`/facility/${facilityId}`);
                    return;
                }
                // disable existing bed types
                const updatedBedTypes = initBedTypes.map((type: OptionsType) => {
                    const isExisting = existingData.find((i: CapacityModal) => i.room_type === type.id);
                    return {
                        ...type,
                        disabled: !!isExisting,
                    }
                });
                setBedTypes(updatedBedTypes);
            }
        } else {
            // Edit Form functionality
            const res = await dispatchAction(getCapacity(id, { facilityId }));
            if (res.data) {
                dispatch({
                    type: "set_form",
                    form: {
                        bedType: res.data.room_type,
                        totalCapacity: res.data.total_capacity,
                        currentOccupancy: res.data.current_capacity,
                    }
                })
            }
        }
        setIsLoading(false);
    }, [dispatchAction, facilityId, id]);

    useEffect(() => {
        fetchData();
    }, [dispatch, fetchData, id]);

    useEffect(() => {
        const lastBedType = bedTypes.filter((i: OptionsType) => i.disabled).length === BED_TYPES.length - 1;
        setIsLastOptionType(lastBedType);
    }, [bedTypes]);

    const handleChange = (e: any) => {
        let form = { ...state.form };
        form[e.target.name] = e.target.value;
        dispatch({ type: "set_form", form })
    };

    const validateData = () => {
        let errors = { ...initForm };
        let invalidForm = false;
        Object.keys(state.form).forEach((field, i) => {
            if (!state.form[field]) {
                errors[field] = "Field is required";
                invalidForm = true;
            } else if (field === "currentOccupancy" && Number(state.form[field]) > Number(state.form.totalCapacity)) {
                errors[field] = "Occupied must be less than or equal to total capacity";
                invalidForm = true;
            }
        });
        if (invalidForm) {
            dispatch({ type: "set_error", errors });
            return false
        }
        dispatch({ type: "set_error", errors });
        return true
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const valid = validateData();
        if (valid) {
            setIsLoading(true);
            const data = {
                "room_type": Number(state.form.bedType),
                "total_capacity": Number(state.form.totalCapacity),
                "current_capacity": Number(state.form.currentOccupancy),
            };
            const res = await dispatchAction(createCapacity(id, data, { facilityId }));
            setIsLoading(false);
            if (res.status !== 201 || !res.data) {
                setAppMessage({ show: true, message: "Something went wrong..!", type: "error" })
            } else {
                // disable last added bed type
                const updatedBedTypes = bedTypes.map((type: OptionsType) => {
                    return {
                        ...type,
                        disabled: (res.data.room_type !== type.id) ? type.disabled : true,
                    }
                });
                setBedTypes(updatedBedTypes);
                // reset form
                dispatch({ type: "set_form", form: initForm });
                // show success message
                if (!id) {
                    setAppMessage({ show: true, message: "Bed capacity added successfully", type: "success" });
                    if (isLastOptionType) {
                        navigate(`/facility/${facilityId}/doctor`);
                    }
                } else {
                    setAppMessage({ show: true, message: "Bed capacity updated successfully", type: "success" });
                    navigate(`/facility/${facilityId}`);
                }
            }
        }
    };
    const handleCancel = () => {
        navigate(`/facility/${facilityId}`);
    };

    if (isLoading) {
        return <Loading />
    }
    return <div>
        <Grid container alignContent="center" justify="center">
            <Grid item xs={12} sm={10} md={8} lg={6} xl={4}>
                <Card style={{ marginTop: '20px' }}>
                    <AppMessage open={showAppMessage.show} type={showAppMessage.type} message={showAppMessage.message} handleClose={() => setAppMessage({ show: false, message: "", type: "" })} handleDialogClose={() => setAppMessage({ show: false, message: "", type: "" })} />
                    <CardHeader title={headerText} />
                    <form onSubmit={e => { handleSubmit(e) }}>
                        <CardContent>
                            <InputLabel id="demo-simple-select-outlined-label">Bed Type*</InputLabel>
                            <NativeSelectField
                                name="bedType"
                                variant="outlined"
                                value={state.form.bedType}
                                options={bedTypes}
                                onChange={handleChange}
                                disabled={!!id}
                            />
                            <ErrorHelperText
                                error={state.errors.bedType}
                            />
                        </CardContent>
                        <CardContent>
                            <InputLabel id="demo-simple-select-outlined-label">Total Capacity*</InputLabel>
                            <TextInputField
                                name="totalCapacity"
                                variant="outlined"
                                margin="dense"
                                type="number"
                                InputLabelProps={{ shrink: !!state.form.totalCapacity }}
                                value={state.form.totalCapacity}
                                onChange={handleChange}
                                errors={state.errors.totalCapacity}
                            />
                        </CardContent>
                        <CardContent>
                            <InputLabel id="demo-simple-select-outlined-label">Currently Occupied*</InputLabel>
                            <TextInputField
                                name="currentOccupancy"
                                variant="outlined"
                                margin="dense"
                                type="number"
                                InputLabelProps={{ shrink: !!state.form.currentOccupancy }}
                                value={state.form.currentOccupancy}
                                onChange={handleChange}
                                errors={state.errors.currentOccupancy}
                            />
                        </CardContent>
                        <CardContent>
                            <CardActions className="padding16" style={{ justifyContent: "space-between" }}>
                                <Button
                                    color="default"
                                    variant="contained"
                                    type="button"
                                    onClick={handleCancel}
                                >Cancel</Button>
                                <Button
                                    color="primary"
                                    variant="contained"
                                    type="submit"
                                    onClick={(e) => handleSubmit(e)}
                                    startIcon={<SaveIcon>save</SaveIcon>}
                                >{buttonText}</Button>
                            </CardActions>
                        </CardContent>
                    </form>
                </Card>
            </Grid>
        </Grid>
    </div>
};
