import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  constructor() { }

  private stream: MediaStream | null = null;

  async startCamera(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      return this.stream;
    } catch (err) {
      console.error('Error accessing the camera', err);
      throw err;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async captureImage(): Promise<string> {
    if (!this.stream) {
      throw new Error('Camera is not started');
    }

    const video = document.createElement('video');
    video.srcObject = this.stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    return imageDataUrl.split(',')[1]; // Return base64 data without MIME type prefix
  }
}
