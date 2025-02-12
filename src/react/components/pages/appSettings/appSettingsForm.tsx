import React from "react";
import { strings, addLocValues } from "../../../../common/strings";
import Form, { FormValidation, Widget } from "react-jsonschema-form";
import { ObjectFieldTemplate } from "../../common/objectField/objectFieldTemplate";
import CustomFieldTemplate from "../../common/customField/customFieldTemplate";
import { ArrayFieldTemplate } from "../../common/arrayField/arrayFieldTemplate";
import { IAppSettings } from "../../../../models/applicationState";
import { ProtectedInput } from "../../common/protectedInput/protectedInput";
import { CustomField } from "../../common/customField/customField";
import { generateKey } from "../../../../common/crypto";

// // tslint:disable-next-line:no-var-requires
// const formSchema = addLocValues(require("./appSettingsForm.json"));
// // tslint:disable-next-line:no-var-requires
// const uiSchema = addLocValues(require("./appSettingsForm.ui.json"));

export interface IAppSettingsFormProps extends React.Props<AppSettingsForm> {
    appSettings: IAppSettings;
    onSubmit: (appSettings: IAppSettings) => void;
    onCancel?: () => void;
}

export interface IAppSettingsFormState {
    classNames: string[];
    formSchema: any;
    uiSchema: any;
    appSettings: IAppSettings;
}

export class AppSettingsForm extends React.Component<IAppSettingsFormProps, IAppSettingsFormState> {
    private fields = {
        securityToken: CustomField(ProtectedInput, (props) => ({
            id: props.idSchema.$id,
            value: props.formData || generateKey(),
            onChange: props.onChange,
        })),
    };

    // tslint:disable-next-line:no-var-requires
    private formSchema = addLocValues(require("./appSettingsForm.json"));
    // tslint:disable-next-line:no-var-requires
    private uiSchema = addLocValues(require("./appSettingsForm.ui.json"));

    constructor(props: IAppSettingsFormProps) {
        super(props);

        this.state = {
            formSchema: { ...this.formSchema },
            uiSchema: { ...this.uiSchema },
            classNames: ["needs-validation"],
            appSettings: { ...this.props.appSettings },
        };

        this.onFormValidate = this.onFormValidate.bind(this);
        this.onFormCancel = this.onFormCancel.bind(this);
    }

    public componentDidMount(): void {

    }

    private reloadShema = () => {
        this.formSchema = addLocValues(require("./appSettingsForm.json"));
        this.uiSchema = addLocValues(require("./appSettingsForm.ui.json"));
    }

    public componentDidUpdate(prevProps: IAppSettingsFormProps) {
        if (prevProps.appSettings !== this.props.appSettings) {
            this.reloadShema();
            this.setState({
                appSettings: { ...this.props.appSettings },
                formSchema: { ...this.formSchema },
                uiSchema: { ...this.uiSchema },
            });
        }
    }

    public render() {
        return (
            <div className="app-settings-page-form p-3">
                <h3 className="mb-3">
                    <i className="fas fa-cog fa-1x"></i>
                    <span className="px-2">{strings.appSettings.title}</span>
                </h3>
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
                        formData={this.state.appSettings}
                        onSubmit={(form) => this.props.onSubmit(form.formData)}>
                        <div>
                            <button type="submit" className="btn btn-success mr-1">{strings.appSettings.save}</button>
                            <button type="button"
                                className="btn btn-secondary btn-cancel"
                                onClick={this.onFormCancel}>{strings.common.cancel}</button>
                        </div>
                    </Form>
                </div>
            </div>
        );
    }

    private onFormValidate(appSettings: IAppSettings, errors: FormValidation) {
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
