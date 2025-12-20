import cv2
import mediapipe as mp
import numpy as np
import time

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Iris indices in MediaPipe Face Mesh
LEFT_IRIS = [474, 475, 476, 477]
RIGHT_IRIS = [469, 470, 471, 472]

# Eye corner indices for reference
LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]

def get_iris_center(landmarks, iris_indices):
    points = []
    for idx in iris_indices:
        lm = landmarks[idx]
        points.append([lm.x, lm.y])
    return np.mean(points, axis=0)

def is_looking_at_screen(landmarks):
    # Get iris centers
    left_iris_center = get_iris_center(landmarks, LEFT_IRIS)
    right_iris_center = get_iris_center(landmarks, RIGHT_IRIS)
    
    # Get eye centers (approximate by averaging eye corner landmarks)
    left_eye_center = get_iris_center(landmarks, LEFT_EYE)
    right_eye_center = get_iris_center(landmarks, RIGHT_EYE)
    
    # Calculate offset (normalized by eye width to handle distance from camera)
    # This is a simplified heuristic: if the iris is close to the center of the eye, 
    # the user is likely looking at the screen.
    
    left_offset = np.linalg.norm(left_iris_center - left_eye_center)
    right_offset = np.linalg.norm(right_iris_center - right_eye_center)
    
    # Threshold for "looking at screen" - may need calibration
    threshold = 0.015 
    
    return left_offset < threshold and right_offset < threshold

# Initialize Webcam
cap = None
for i in [0, 1, 2]:
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f"Using camera index {i}")
        break
    cap.release()

if cap is None or not cap.isOpened():
    print("Error: Could not open any camera. Please ensure no other app (like a browser) is using it.")
    exit()

# Attention Tracking Variables
session_start_time = time.time()
total_frames = 0
focus_frames = 0
attention_score = 0
history = [] # Rolling window for real-time score

while cap.isOpened():
    success, image = cap.read()
    if not success:
        continue

    # Flip for selfie view
    image = cv2.flip(image, 1)
    
    image.flags.writeable = False
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    
    status_text = "Looking Away"
    status_color = (0, 0, 255) # Red
    
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0].landmark
        
        looking = is_looking_at_screen(landmarks)
        
        total_frames += 1
        if looking:
            focus_frames += 1
            status_text = "Focused"
            status_color = (0, 255, 0) # Green
            history.append(1)
        else:
            history.append(0)
            
        # Keep history to last 100 frames (~3-5 seconds)
        if len(history) > 100:
            history.pop(0)
            
        attention_score = (sum(history) / len(history)) * 100
        
        # Draw irises for visual feedback
        h, w, _ = image.shape
        for idx in LEFT_IRIS + RIGHT_IRIS:
            lm = landmarks[idx]
            cv2.circle(image, (int(lm.x * w), int(lm.y * h)), 2, (255, 255, 255), -1)

    # UI Overlay
    cv2.putText(image, f"Status: {status_text}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
    cv2.putText(image, f"Attention Score: {attention_score:.1f}%", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
    
    session_time = int(time.time() - session_start_time)
    cv2.putText(image, f"Session Time: {session_time}s", (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)

    cv2.imshow('Attention Span Tracker', image)
    
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# Final Stats
print("\n--- Session Summary ---")
print(f"Total Time: {int(time.time() - session_start_time)} seconds")
if total_frames > 0:
    print(f"Overall Focus Score: {(focus_frames / total_frames) * 100:.1f}%")
