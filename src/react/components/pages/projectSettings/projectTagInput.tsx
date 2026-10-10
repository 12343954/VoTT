import React from "react";
import { ITagsInputProps, TagsInput } from "vott-react";
import { ITag } from "../../../../models/applicationState";
import "./projectTagInput.scss";

interface IPoint {
    x: number;
    y: number;
}

interface IProjectTagInputState {
    selectedTag: ITag;
    pickerPosition: IPoint;
    isDragging: boolean;
}

export default class ProjectTagInput extends React.Component<ITagsInputProps, IProjectTagInputState> {
    private static pickerWidth = 220;
    private static pickerHeight = 92;
    private static pickerMargin = 8;

    public state: IProjectTagInputState = {
        selectedTag: null,
        pickerPosition: null,
        isDragging: false,
    };

    private tagsInput = React.createRef<TagsInput>();
    private dragOffset: IPoint = null;

    public componentWillUnmount() {
        this.removeDocumentListeners();
    }

    public render() {
        return (
            <div onDoubleClick={this.onDoubleClick}>
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

    private onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
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
            pickerPosition: this.getPickerPosition(target.getBoundingClientRect()),
        }, this.addDocumentListeners);
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
            </div>
        );
    }

    private onColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.updateSelectedTagColor(event.target.value);
    }

    private onColorTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const color = event.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(color)) {
            this.updateSelectedTagColor(color);
        }
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
            pickerPosition: null,
            isDragging: false,
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
