import { Component, input, output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ],
  templateUrl: './file-upload.component.html'})
export class FileUploadComponent implements ControlValueAccessor {
  id = input<string>(`file-upload-${Math.random().toString(36).substr(2, 9)}`);
  accept = input<string>('');
  multiple = input<boolean>(false);

  fileChanged = output<File[]>();

  isDragging = false;
  files: File[] = [];

  onChange: any = () => {};
  onTouch: any = () => {};

  writeValue(value: any): void {
    if (value === null || value === undefined) {
      this.files = [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    
    if (event.dataTransfer?.files.length) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelected(event: any) {
    if (event.target.files.length) {
       this.handleFiles(Array.from(event.target.files));
    }
  }

  private handleFiles(newFiles: File[]) {
    if (this.multiple()) {
        this.files = [...this.files, ...newFiles];
    } else {
        this.files = [newFiles[0]];
    }
    this.emitChange();
  }

  removeFile(fileToRemove: File) {
      this.files = this.files.filter(f => f !== fileToRemove);
      this.emitChange();
  }

  private emitChange() {
      const valueToEmit = this.multiple() ? this.files : this.files[0] || null;
      this.onChange(valueToEmit);
      this.fileChanged.emit(this.files);
  }
}

