import React from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import Form, { FormValidation, Widget } from "react-jsonschema-form";

import { strings, addLocValues } from "../../../../common/strings";
import { IUser } from "../../../../models/applicationState";

import { ArrayFieldTemplate } from "../../common/arrayField/arrayFieldTemplate";
import { ObjectFieldTemplate } from "../../common/objectField/objectFieldTemplate";
import CustomFieldTemplate from "../../common/customField/customFieldTemplate";
import { ProtectedInput } from "../../common/protectedInput/protectedInput";
import { CustomField } from "../../common/customField/customField";

// // tslint:disable-next-line:no-var-requires
// const formSchema = addLocValues(require("./userLoginForm.json"));
// // tslint:disable-next-line:no-var-requires
// const uiSchema = addLocValues(require("./userLoginForm.ui.json"));

/**
 * Properties for Cloud File Picker
 * @member connections - Array of connections to choose from
 * @member onSubmit - Function to call with contents of selected file
 * @member onCancel - Optional function to call on modal closed
 */
export interface IUserLoginFormProps {
    isOpen: boolean;
    modalHeader?: string;
    onSubmit: (content: IUser) => void;
    onCancel?: () => void;
}

/**
 * State for Cloud File Picker
 * @member isOpen - Cloud File Picker is open
 * @member modalHeader - Header for Picker modal
 * @member condensedList - List of rendered objects for picking
 * @member selectedConnection - Connection selected in picker
 * @member selectedFile - File selected in picker
 * @member okDisabled - Ok button is disabled
 * @member backDisabled - Back button is disabled
 */
export interface IUserLoginFormState {
    isOpen: boolean;
    user?: IUser;
    classNames: string[];
    formSchema: any;
    uiSchema: any;
}

/**
 * @name - User Login Form
 * @description - Modal dialog to user login
 */
export default class UserLoginForm extends React.Component<IUserLoginFormProps, IUserLoginFormState> {
    private fields = {
        account: CustomField(ProtectedInput, (props) => ({})),
        password: CustomField(ProtectedInput, (props) => ({})),
    }

    // tslint:disable-next-line:no-var-requires
    private formSchema = addLocValues(require("./userLoginForm.json"));
    // tslint:disable-next-line:no-var-requires
    private uiSchema = addLocValues(require("./userLoginForm.ui.json"));

    constructor(props) {
        super(props);

        this.state = this.getInitialState();
        this.onFormValidate = this.onFormValidate.bind(this);
    }

    public componentDidMount(): void {
        this.formSchema = addLocValues(require("./userLoginForm.json"));
        this.uiSchema = addLocValues(require("./userLoginForm.ui.json"));
        this.setState({
            uiSchema: { ...this.uiSchema },
            formSchema: { ...this.formSchema },
        })
    }

    public render() {
        const closeBtn = <button className="close" onClick={this.props.onCancel}>&times;</button>;

        return (
            <Modal isOpen={this.props.isOpen} centered={true}>
                <ModalHeader toggle={() => this.onFormCancel()} close={closeBtn}>
                    {this.props.modalHeader}
                </ModalHeader>
                <ModalBody>
                    <div className="m-3">
                        <Form
                            className={this.state.classNames.join(" ")}
                            showErrorList={false}
                            liveValidate={true}
                            noHtml5Validate={true}
                            fields={this.fields}
                            ObjectFieldTemplate={ObjectFieldTemplate}
                            FieldTemplate={CustomFieldTemplate}
                            ArrayFieldTemplate={ArrayFieldTemplate}
                            validate={this.onFormValidate}
                            schema={this.state.formSchema}
                            uiSchema={this.state.uiSchema}
                            formData={this.state.user}
                            onSubmit={(form) => this.props.onSubmit(form.formData)}>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-success mr-1">{strings.user.button.login}</button>
                                <button type="button"
                                    className="btn btn-secondary btn-cancel"
                                    onClick={() => this.onFormCancel()}>{strings.common.cancel}</button>
                            </div>
                        </Form>
                    </div>
                </ModalBody>
            </Modal>
        );
    }

    private getInitialState(): IUserLoginFormState {
        return {
            isOpen: false,
            formSchema: { ...this.formSchema },
            uiSchema: { ...this.uiSchema },
            classNames: ["needs-validation"],
        };
    }

    private async ok() {
        // if (this.state.selectedConnection && this.state.selectedFile) {
        //     const storageProvider = StorageProviderFactory.createFromConnection(this.state.selectedConnection);
        //     const content = await storageProvider.readText(this.state.selectedFile);
        //     this.props.onSubmit(null);
        // }
    }

    private onFormValidate(user: IUser, errors: FormValidation) {
        if (this.state.classNames.indexOf("was-validated") === -1) {
            this.setState({
                classNames: [...this.state.classNames, "was-validated"],
            });
        }

        return errors;
    }

    private onFormCancel() {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }
}
