import React from "react";
import Form, { Widget, IChangeEvent, FormValidation } from "react-jsonschema-form";
import { IConnection } from "../../../../models/applicationState";
import LocalFolderPicker from "../../common/localFolderPicker/localFolderPicker";
import { strings, addLocValues } from "../../../../common/strings";
import CustomFieldTemplate from "../../common/customField/customFieldTemplate";
import ConnectionProviderPicker from "../../common/connectionProviderPicker/connectionProviderPicker";
import { ProtectedInput } from "../../common/protectedInput/protectedInput";
import Checkbox from "rc-checkbox";
import "rc-checkbox/assets/index.css";
import { CustomWidget } from "../../common/customField/customField";
import { isBrowser } from "../../../../common/hostProcess";

// tslint:disable-next-line:no-var-requires
// const formSchema = addLocValues(require("./connectionForm.json"));
// tslint:disable-next-line:no-var-requires
// const uiSchema = addLocValues(require("./connectionForm.ui.json"));

/**
 * Properties for Connection form
 * @member connection - Form being viewed/edited
 * @member onSubmit - Function called upon form submission
 * @member onCancel - Function called upon cancellation of form
 */
export interface IConnectionFormProps extends React.Props<ConnectionForm> {
    connection: IConnection;
    onSubmit: (connection: IConnection) => void;
    onCancel?: () => void;
}

/**
 * State for Connection Form
 * @member providerName - Name of connection provider
 * @member formSchema - JSON Form Schema
 * @member uiSchema - JSON Form UI Schema
 * @member formData - Current state of form data as a Connection
 * @member classNames - HTML Class names for form element
 */
export interface IConnectionFormState {
    providerName: string;
    formSchema: any;
    uiSchema: any;
    formData: IConnection;
    classNames: string[];
}

/**
 * Form for viewing, creating and editing connections
 */
export default class ConnectionForm extends React.Component<IConnectionFormProps, IConnectionFormState> {
    private widgets = {
        localFolderPicker: (LocalFolderPicker as any) as Widget,
        connectionProviderPicker: (ConnectionProviderPicker as any) as Widget,
        protectedInput: (ProtectedInput as any) as Widget,
        checkbox: CustomWidget(Checkbox, (props) => ({
            checked: props.value,
            onChange: (value) => props.onChange(value.target.checked),
            disabled: props.disabled,
        })),
    };

    // tslint:disable-next-line:no-var-requires
    private formSchema = addLocValues(require("./connectionForm.json"));
    // tslint:disable-next-line:no-var-requires
    private uiSchema = addLocValues(require("./connectionForm.ui.json"));

    constructor(props, context) {
        super(props, context);

        this.state = {
            classNames: ["needs-validation"],
            formSchema: { ...this.formSchema },
            uiSchema: { ...this.uiSchema },
            providerName: this.props.connection ? this.props.connection.providerType : null,
            formData: this.props.connection,
        };

        if (this.props.connection) {
            this.bindForm(this.props.connection);
        }

        this.onFormCancel = this.onFormCancel.bind(this);
        this.onFormValidate = this.onFormValidate.bind(this);
        this.onFormChange = this.onFormChange.bind(this);
    }

    public componentDidMount(): void {
        this.formSchema = addLocValues(require("./connectionForm.json"));
        this.uiSchema = addLocValues(require("./connectionForm.ui.json"));
        this.setState({
            uiSchema: { ...this.uiSchema },
            formSchema: { ...this.formSchema },
        })
    }

    public componentDidUpdate(prevProps: IConnectionFormProps) {
        if (prevProps.connection !== this.props.connection) {
            this.bindForm(this.props.connection);
        }
    }

    public render() {
        return (
            <div className="app-connections-page-detail m-3">
                <h3>
                    <i className="fas fa-plug fa-1x"></i>
                    <span className="px-2">
                        {strings.connections.settings}
                    </span>
                </h3>
                <div className="m-3">
                    {isBrowser() && this.state.providerName === "bingImageSearch" &&
                        <div className="alert alert-warning" role="alert">
                            <i className="fas fa-exclamation-circle mr-1" aria-hidden="true"></i>
                            {strings.connections.imageCorsWarning}
                        </div>
                    }
                    {isBrowser() && this.state.providerName === "azureBlobStorage" &&
                        <div className="alert alert-warning" role="alert">
                            <i className="fas fa-exclamation-circle mr-1" aria-hidden="true"></i>
                            {strings.formatString(
                                strings.connections.blobCorsWarning,
                                <a href="https://aka.ms/blob-cors" target="_blank">{strings.connections.azDocLinkText}</a>)
                            }
                        </div>
                    }
                    <Form
                        className={this.state.classNames.join(" ")}
                        showErrorList={false}
                        liveValidate={true}
                        noHtml5Validate={true}
                        FieldTemplate={CustomFieldTemplate}
                        validate={this.onFormValidate}
                        widgets={this.widgets}
                        schema={this.state.formSchema}
                        uiSchema={this.state.uiSchema}
                        formData={this.state.formData}
                        onChange={this.onFormChange}
                        onSubmit={(form) => this.props.onSubmit(form.formData)}>
                        <div>
                            <button className="btn btn-success mr-1" type="submit">{strings.connections.save}</button>
                            <button className="btn btn-secondary btn-cancel"
                                type="button"
                                onClick={this.onFormCancel}>{strings.common.cancel}</button>
                        </div>
                    </Form>
                </div>
            </div>
        );
    }

    private onFormValidate(connection: IConnection, errors: FormValidation) {
        if (connection.providerType === "") {
            errors.providerType.addError("is a required property");
        }

        if (this.state.classNames.indexOf("was-validated") === -1) {
            this.setState({
                classNames: [...this.state.classNames, "was-validated"],
            });
        }

        return errors;
    }

    private onFormChange = (args: IChangeEvent<IConnection>) => {
        const providerType = args.formData.providerType;

        if (providerType !== this.state.providerName) {
            this.bindForm(args.formData, true);
        } else {
            this.setState({
                formData: args.formData,
            });
        }
    }

    private onFormCancel() {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }

    private bindForm(connection: IConnection, resetProviderOptions: boolean = false) {
        const providerType = connection ? connection.providerType : null;
        let newFormSchema: any = this.state.formSchema;
        let newUiSchema: any = this.state.uiSchema;

        if (providerType) {
            const providerSchema = addLocValues(require(`../../../../providers/storage/${providerType}.json`));
            const providerUiSchema = addLocValues(require(`../../../../providers/storage/${providerType}.ui.json`));

            newFormSchema = { ...this.formSchema };
            newFormSchema.properties["providerOptions"] = providerSchema;

            newUiSchema = { ...this.uiSchema };
            newUiSchema["providerOptions"] = providerUiSchema;
        } else {
            newFormSchema = { ...this.formSchema };
            delete newFormSchema.properties["providerOptions"];

            newUiSchema = { ...this.uiSchema };
            delete newUiSchema["providerOptions"];

            resetProviderOptions = true;
        }

        const formData = { ...connection };
        if (resetProviderOptions) {
            formData.providerOptions = {};
        }

        this.setState({
            providerName: providerType,
            formSchema: newFormSchema,
            uiSchema: newUiSchema,
            formData,
        });
    }
}
