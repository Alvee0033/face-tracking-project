import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import Script from 'next/script';
import styles from '../styles/Home.module.css';

const drawConnectors = (ctx, landmarks, connections, style) => {
    if (!ctx || !landmarks || !connections) return;
    const canvas = ctx.canvas;
    ctx.save();
    if (style && style.color) ctx.strokeStyle = style.color;
    if (style && style.lineWidth) ctx.lineWidth = style.lineWidth;

    for (const connection of connections) {
        const start = landmarks[connection[0]];
        const end = landmarks[connection[1]];
        if (start && end) {
            ctx.beginPath();
            ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
            ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
            ctx.stroke();
        }
    }
    ctx.restore();
};

const HolisticTracker = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [scriptsLoaded, setScriptsLoaded] = useState({ holistic: false, camera: false, objectDetector: true });
    const [attentionScore, setAttentionScore] = useState(0);
    const [status, setStatus] = useState("Initializing...");
    const [trackingMode, setTrackingMode] = useState('holistic'); // 'holistic' or 'object'
    const historyRef = useRef([]);

    useEffect(() => {
        let model;
        let camera;

        const initTracking = async () => {
            if (scriptsLoaded.camera) {
                if (trackingMode === 'holistic' && scriptsLoaded.holistic) {
                    model = new window.Holistic({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
                    });
                    model.setOptions({
                        modelComplexity: 1,
                        smoothLandmarks: true,
                        refineFaceLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });
                    model.onResults(onResultsHolistic);
                    startCamera(model);
                } else if (trackingMode === 'object' && scriptsLoaded.objectDetector) {
                    // Bypass Turbopack's dynamic import restriction for remote URLs
                    const importDynamic = new Function('url', 'return import(url)');
                    const visionModule = await importDynamic("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs");

                    const vision = await visionModule.FilesetResolver.forVisionTasks(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                    );
                    model = await visionModule.ObjectDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                            delegate: "GPU"
                        },
                        scoreThreshold: 0.5,
                        runningMode: "VIDEO"
                    });
                    startCamera(model);
                }
            }
        };

        const startCamera = (m) => {
            if (typeof window !== "undefined" && webcamRef.current && webcamRef.current.video) {
                camera = new window.Camera(webcamRef.current.video, {
                    onFrame: async () => {
                        if (webcamRef.current && webcamRef.current.video) {
                            if (trackingMode === 'holistic') {
                                await m.send({ image: webcamRef.current.video });
                            } else {
                                const detections = m.detectForVideo(webcamRef.current.video, performance.now());
                                onResultsObject(detections);
                            }
                        }
                    },
                    width: 1280,
                    height: 720
                });
                camera.start();
            }
        };

        initTracking();

        return () => {
            if (camera) camera.stop();
            if (model && model.close) model.close();
        };
    }, [scriptsLoaded, trackingMode]);

    const onResultsHolistic = (results) => {
        if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;

        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        let looking = false;

        // 1. Draw Face Mesh & Calculate Attention
        if (results.faceLandmarks) {
            const tess = window.FACEMESH_TESSELATION;
            if (tess) drawConnectors(canvasCtx, results.faceLandmarks, tess, { color: '#C0C0C070', lineWidth: 1 });

            // Attention Logic
            const landmarks = results.faceLandmarks;
            const LEFT_IRIS = [474, 475, 476, 477];
            const RIGHT_IRIS = [469, 470, 471, 472];
            const LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
            const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];

            const getCenter = (indices) => {
                let x = 0, y = 0;
                indices.forEach(i => { x += landmarks[i].x; y += landmarks[i].y; });
                return { x: x / indices.length, y: y / indices.length };
            };

            const lIris = getCenter(LEFT_IRIS);
            const rIris = getCenter(RIGHT_IRIS);
            const lEye = getCenter(LEFT_EYE);
            const rEye = getCenter(RIGHT_EYE);

            const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            const lOffset = dist(lIris, lEye);
            const rOffset = dist(rIris, rEye);

            const threshold = 0.015;
            looking = lOffset < threshold && rOffset < threshold;

            // Draw irises
            [...LEFT_IRIS, ...RIGHT_IRIS].forEach(i => {
                canvasCtx.beginPath();
                canvasCtx.arc(landmarks[i].x * videoWidth, landmarks[i].y * videoHeight, 2, 0, 2 * Math.PI);
                canvasCtx.fillStyle = 'white';
                canvasCtx.fill();
            });
        }

        // Update Attention Score
        historyRef.current.push(looking ? 1 : 0);
        if (historyRef.current.length > 50) historyRef.current.shift();
        const score = (historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length) * 100;
        setAttentionScore(score);
        setStatus(looking ? "Focused" : "Looking Away");

        // 2. Draw Pose
        if (results.poseLandmarks) {
            const poseConn = window.POSE_CONNECTIONS;
            if (poseConn) drawConnectors(canvasCtx, results.poseLandmarks, poseConn, { color: '#00FF00', lineWidth: 2 });
        }

        // 3. Draw Hands
        if (results.leftHandLandmarks) {
            const handConn = window.HAND_CONNECTIONS;
            if (handConn) drawConnectors(canvasCtx, results.leftHandLandmarks, handConn, { color: '#FF0000', lineWidth: 2 });
        }
        if (results.rightHandLandmarks) {
            const handConn = window.HAND_CONNECTIONS;
            if (handConn) drawConnectors(canvasCtx, results.rightHandLandmarks, handConn, { color: '#0000FF', lineWidth: 2 });
        }

        canvasCtx.restore();
    };

    const onResultsObject = (results) => {
        if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        results.detections.forEach(detection => {
            const { originX, originY, width, height } = detection.boundingBox;
            canvasCtx.strokeStyle = "#00f260";
            canvasCtx.lineWidth = 4;
            canvasCtx.strokeRect(originX, originY, width, height);

            const label = detection.categories[0].categoryName;
            const score = Math.round(detection.categories[0].score * 100);
            canvasCtx.fillStyle = "#00f260";
            canvasCtx.font = "18px Inter";
            canvasCtx.fillText(`${label} ${score}%`, originX, originY > 20 ? originY - 10 : 20);
        });
        canvasCtx.restore();
    };

    return (
        <div className={styles.container}>
            <div className={styles.modeSelector}>
                <button
                    className={`${styles.modeButton} ${trackingMode === 'holistic' ? styles.activeMode : ''}`}
                    onClick={() => setTrackingMode('holistic')}
                >
                    Holistic & Attention
                </button>
                <button
                    className={`${styles.modeButton} ${trackingMode === 'object' ? styles.activeMode : ''}`}
                    onClick={() => setTrackingMode('object')}
                >
                    Object Detection
                </button>
            </div>

            {trackingMode === 'holistic' && (
                <div className={styles.statsPanel}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Status</span>
                        <span className={`${styles.statValue} ${status === "Focused" ? styles.focused : styles.away}`}>
                            {status}
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Attention Score</span>
                        <div className={styles.scoreBarContainer}>
                            <div
                                className={styles.scoreBar}
                                style={{ width: `${attentionScore}%`, backgroundColor: attentionScore > 70 ? '#00f260' : attentionScore > 30 ? '#f2a100' : '#f23030' }}
                            />
                        </div>
                        <span className={styles.statValue}>{Math.round(attentionScore)}%</span>
                    </div>
                </div>
            )}

            <div className={styles.cameraContainer}>
                <Script
                    src="https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js"
                    onLoad={() => setScriptsLoaded(prev => ({ ...prev, holistic: true }))}
                />
                <Script
                    src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
                    onLoad={() => setScriptsLoaded(prev => ({ ...prev, camera: true }))}
                />

                <Webcam
                    ref={webcamRef}
                    className={styles.webcam}
                    mirrored={true}
                />
                <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                />
            </div>
        </div>
    );
};

export default HolisticTracker;
