import cv2
import torch
from ultralytics import YOLO
import numpy as np

# Initialize YOLOv5 model (will auto-download on first run)
print("Loading YOLOv5 model...")
model = YOLO('yolov5s.pt')  # YOLOv5 small model
print("Model loaded successfully!")

# Initialize Webcam
cap = None
for i in [0, 1, 2]:
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f"Using camera index {i}")
        break
    cap.release()

if cap is None or not cap.isOpened():
    print("Error: Could not open any camera.")
    exit()

while cap.isOpened():
    success, image = cap.read()
    if not success:
        continue

    # Run YOLOv5 inference
    results = model(image, verbose=False)
    
    # Get the first result (we only process one image at a time)
    result = results[0]
    
    # Draw detection results on the image
    for box in result.boxes:
        # Get bounding box coordinates
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        
        # Get confidence score and class
        conf = float(box.conf[0])
        cls = int(box.cls[0])
        class_name = model.names[cls]
        
        # Draw bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # Create label with class name and confidence
        label = f"{class_name} {conf:.2f}"
        
        # Draw label background
        (label_width, label_height), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
        )
        cv2.rectangle(
            image, 
            (x1, y1 - label_height - 10),
            (x1 + label_width, y1),
            (0, 255, 0),
            -1
        )
        
        # Draw label text
        cv2.putText(
            image, 
            label, 
            (x1, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            2
        )

    # Display the resulting frame
    cv2.imshow('PyTorch Object Detection (YOLOv5)', image)

    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
