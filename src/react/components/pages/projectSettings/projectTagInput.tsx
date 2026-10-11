import React from "react";
import { ITagsInputProps, TagsInput } from "vott-react";
import { ITag } from "../../../../models/applicationState";
import { DEFAULT_TAG_HOTKEYS, isReservedTagHotkey, normalizeTagHotkey } from "../../../../common/tagHotkeys";
import { interpolate, strings } from "../../../../common/strings";
import "./projectTagInput.scss";

interface IPoint {
    x: number;
    y: number;
}

interface IProjectTagInputState {
    selectedTag: ITag;
    tagNameText: string;
    pickerPosition: IPoint;
    isDragging: boolean;
    nameError: string;
    shortcutError: string;
}

export default class ProjectTagInput extends React.Component<ITagsInputProps, IProjectTagInputState> {
    private static pickerWidth = 260;
    private static pickerHeight = 222;
    private static pickerMargin = 8;

    public state: IProjectTagInputState = {
        selectedTag: null,
        tagNameText: "",
        pickerPosition: null,
        isDragging: false,
        nameError: null,
        shortcutError: null,
    };

    private tagsInput = React.createRef<TagsInput>();
    private root = React.createRef<HTMLDivElement>();
    private dragOffset: IPoint = null;
    private badgeUpdateHandle: number = null;

    public componentDidMount() {
        this.scheduleTagHotkeyBadgeUpdate();
    }

    public componentDidUpdate() {
        this.scheduleTagHotkeyBadgeUpdate();
    }

    public componentWillUnmount() {
        if (this.badgeUpdateHandle !== null) {
            window.clearTimeout(this.badgeUpdateHandle);
        }
        this.removeDocumentListeners();
    }

    public render() {
        return (
            <div ref={this.root} onClick={this.onColorBoxClick} onDoubleClick={this.onColorBoxClick}>
                <TagsInput
                    {...this.props}
                    ref={this.tagsInput}
                />
                {this.renderColorPicker()}
            </div>
        );
    }

    public updateTag = (oldTag: ITag, newTag: ITag) => {
        this.tagsInput.current.updateTag(oldTag, newTag);
    }

    private onColorBoxClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        if (!target || !target.classList || !target.classList.contains("tag-color-box")) {
            return;
        }

        const tagName = this.getTagName(target);
        const tag = tagName ? this.props.tags.find((item) => item.name === tagName) : null;
        if (!tag) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.setState({
            selectedTag: tag,
            tagNameText: tag.name,
            pickerPosition: this.getPickerPosition(target.getBoundingClientRect()),
            nameError: null,
            shortcutError: this.getShortcutError(tag),
        }, this.addDocumentListeners);
    }

    private updateTagHotkeyBadges = () => {
        this.badgeUpdateHandle = null;
        if (!this.root.current || !this.props.tags) {
            return;
        }

        const colorBoxes = this.root.current.querySelectorAll(".tag-color-box");
        Array.prototype.forEach.call(colorBoxes, (colorBox: HTMLElement) => {
            const tagName = this.getTagName(colorBox);
            const tag = tagName ? this.props.tags.find((item) => item.name === tagName) : null;
            const hotkey = tag ? ((tag as ITag).hotkey || this.getDefaultHotkey(tag as ITag)) : "";
            colorBox.setAttribute("data-hotkey", hotkey || "");
            colorBox.setAttribute("data-hotkey-tone", this.getHotkeyTone(tag && tag.color));
            colorBox.setAttribute("title", hotkey
                ? interpolate(strings.tags.warnings.shortcutTooltip, { hotkey })
                : strings.tags.warnings.editTooltip);
        });
    }

    private scheduleTagHotkeyBadgeUpdate = () => {
        if (this.badgeUpdateHandle !== null) {
            return;
        }

        this.badgeUpdateHandle = window.setTimeout(this.updateTagHotkeyBadges, 0);
    }

    private renderColorPicker() {
        const { selectedTag, pickerPosition } = this.state;
        if (!selectedTag || !pickerPosition) {
            return null;
        }

        return (
            <div
                className="project-tag-color-picker"
                style={{
                    left: pickerPosition.x,
                    top: pickerPosition.y,
                }}
                onMouseDown={(event) => event.stopPropagation()}>
                <div className="project-tag-color-picker-header" onMouseDown={this.onPickerMouseDown}>
                    <span>{selectedTag.name}</span>
                    <button type="button" onClick={this.closePicker}>x</button>
                </div>
                <div className="project-tag-color-picker-body">
                    <label>
                        <span>{strings.tags.modal.name}</span>
                        <input
                            type="text"
                            value={this.state.tagNameText}
                            onChange={this.onNameChange}
                        />
                        {this.state.nameError &&
                            <span className="project-tag-field-error">{this.state.nameError}</span>
                        }
                    </label>
                    <label>
                        <span>{strings.tags.modal.color}</span>
                        <div className="project-tag-color-picker-row">
                            <input
                                type="color"
                                value={selectedTag.color || "#000000"}
                                onChange={this.onColorChange}
                            />
                            <input
                                type="text"
                                value={selectedTag.color || "#000000"}
                                onChange={this.onColorTextChange}
                            />
                        </div>
                    </label>
                    <label>
                        <span>{strings.tags.modal.shortcut}</span>
                        <input
                            type="text"
                            value={selectedTag.hotkey || ""}
                            placeholder={this.getDefaultHotkey(selectedTag) || ""}
                            onChange={this.onHotkeyChange}
                        />
                        {this.state.shortcutError &&
                            <span className="project-tag-field-error">{this.state.shortcutError}</span>
                        }
                    </label>
                </div>
            </div>
        );
    }

    private onColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.updateSelectedTagColor(event.target.value);
    }

    private onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.updateSelectedTagName(event.target.value);
    }

    private onColorTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const color = event.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(color)) {
            this.updateSelectedTagColor(color);
        }
    }

    private onHotkeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.updateSelectedTagHotkey(event.target.value);
    }

    private updateSelectedTagColor(color: string) {
        const selectedTag = this.state.selectedTag;
        if (!selectedTag) {
            return;
        }

        this.updateTag(selectedTag, {
            ...selectedTag,
            color,
        });
        this.setState({
            selectedTag: {
                ...selectedTag,
                color,
            },
        });
    }

    private updateSelectedTagName(name: string) {
        const selectedTag = this.state.selectedTag;
        if (!selectedTag) {
            return;
        }

        const trimmedName = name.trim();
        const nameError = this.getNameError(selectedTag, trimmedName);
        if (nameError) {
            this.setState({
                tagNameText: name,
                nameError,
            });
            return;
        }

        const newTag = {
            ...selectedTag,
            name: trimmedName,
        };
        this.updateTag(selectedTag, newTag);
        this.setState({
            selectedTag: newTag,
            tagNameText: name,
            nameError: null,
            shortcutError: this.getShortcutError(newTag),
        });
    }

    private updateSelectedTagHotkey(hotkey: string) {
        const selectedTag = this.state.selectedTag;
        if (!selectedTag) {
            return;
        }

        const normalizedHotkey = normalizeTagHotkey(hotkey);
        const newTag = {
            ...selectedTag,
            hotkey: normalizedHotkey || undefined,
        };
        this.updateTag(selectedTag, newTag);
        this.setState({
            selectedTag: newTag,
            shortcutError: this.getShortcutError(newTag),
        });
    }

    private getDefaultHotkey(tag: ITag): string {
        const index = this.props.tags ? this.props.tags.findIndex((item) => item.name === tag.name) : -1;
        return index >= 0 ? DEFAULT_TAG_HOTKEYS[index] : null;
    }

    private getHotkeyTone(color: string): string {
        if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            return "light";
        }

        const red = parseInt(color.substr(1, 2), 16);
        const green = parseInt(color.substr(3, 2), 16);
        const blue = parseInt(color.substr(5, 2), 16);
        const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
        return luminance > 125 ? "dark" : "light";
    }

    private getShortcutError(tag: ITag): string {
        const hotkey = normalizeTagHotkey(tag && tag.hotkey);
        if (!hotkey) {
            return null;
        }

        if (isReservedTagHotkey(hotkey)) {
            return interpolate(strings.tags.warnings.shortcutReserved, { hotkey });
        }

        const duplicate = (this.props.tags || []).some((item) => {
            const itemHotkey = normalizeTagHotkey((item as ITag).hotkey);
            return item.name !== tag.name
                && itemHotkey
                && itemHotkey.toUpperCase() === hotkey.toUpperCase();
        });
        return duplicate ? interpolate(strings.tags.warnings.shortcutDuplicate, { hotkey }) : null;
    }

    private getNameError(tag: ITag, name: string): string {
        if (!name) {
            return strings.tags.warnings.emptyName;
        }

        const duplicate = (this.props.tags || []).some((item) => {
            return item.name !== tag.name && item.name.toUpperCase() === name.toUpperCase();
        });
        return duplicate ? interpolate(strings.tags.warnings.nameExists, { name }) : null;
    }

    private getPickerPosition(anchor: ClientRect | DOMRect): IPoint {
        const margin = ProjectTagInput.pickerMargin;
        const width = ProjectTagInput.pickerWidth;
        const height = ProjectTagInput.pickerHeight;
        const candidates: IPoint[] = [
            { x: anchor.right + margin, y: anchor.top + (anchor.height - height) / 2 },
            { x: anchor.left - width - margin, y: anchor.top + (anchor.height - height) / 2 },
            { x: anchor.left, y: anchor.bottom + margin },
            { x: anchor.left, y: anchor.top - height - margin },
        ];

        const fit = candidates.find((point) => {
            return point.x >= margin
                && point.y >= margin
                && point.x + width <= window.innerWidth - margin
                && point.y + height <= window.innerHeight - margin;
        }) || candidates[0];

        return this.clampPosition(fit);
    }

    private clampPosition(point: IPoint): IPoint {
        const margin = ProjectTagInput.pickerMargin;
        return {
            x: Math.max(margin, Math.min(point.x, window.innerWidth - ProjectTagInput.pickerWidth - margin)),
            y: Math.max(margin, Math.min(point.y, window.innerHeight - ProjectTagInput.pickerHeight - margin)),
        };
    }

    private onPickerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        this.dragOffset = {
            x: event.clientX - this.state.pickerPosition.x,
            y: event.clientY - this.state.pickerPosition.y,
        };
        this.setState({ isDragging: true });
        document.addEventListener("mousemove", this.onPickerMouseMove);
        document.addEventListener("mouseup", this.onPickerMouseUp);
    }

    private onPickerMouseMove = (event: MouseEvent) => {
        if (!this.state.isDragging || !this.dragOffset) {
            return;
        }

        this.setState({
            pickerPosition: this.clampPosition({
                x: event.clientX - this.dragOffset.x,
                y: event.clientY - this.dragOffset.y,
            }),
        });
    }

    private onPickerMouseUp = () => {
        this.dragOffset = null;
        this.setState({ isDragging: false });
        document.removeEventListener("mousemove", this.onPickerMouseMove);
        document.removeEventListener("mouseup", this.onPickerMouseUp);
    }

    private addDocumentListeners = () => {
        document.addEventListener("mousedown", this.onDocumentMouseDown);
        document.addEventListener("keydown", this.onDocumentKeyDown);
    }

    private removeDocumentListeners = () => {
        document.removeEventListener("mousedown", this.onDocumentMouseDown);
        document.removeEventListener("keydown", this.onDocumentKeyDown);
        document.removeEventListener("mousemove", this.onPickerMouseMove);
        document.removeEventListener("mouseup", this.onPickerMouseUp);
    }

    private onDocumentMouseDown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target && target.closest && target.closest(".project-tag-color-picker")) {
            return;
        }
        this.closePicker();
    }

    private onDocumentKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            this.closePicker();
        }
    }

    private closePicker = () => {
        this.removeDocumentListeners();
        this.dragOffset = null;
        this.setState({
            selectedTag: null,
            tagNameText: "",
            pickerPosition: null,
            isDragging: false,
            nameError: null,
            shortcutError: null,
        });
    }

    private getTagName(element: HTMLElement): string {
        let current = element.parentElement;
        while (current) {
            const tagName = current.getAttribute("data-tag-name");
            if (tagName) {
                return tagName.trim();
            }
            current = current.parentElement;
        }
        return null;
    }
}
