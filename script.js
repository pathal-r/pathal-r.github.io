// ===== Navbar Toggle =====
document.querySelector('.nav-toggle').addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('active');
});
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('active'));
});

// ===== AI Interview Chat =====
const RUPESH_CONTEXT = `You are an AI version of Rupesh Pathak, a Robotics Perception Engineer. Answer questions as if you ARE Rupesh, in first person. Be friendly, professional, and conversational. Keep answers concise but informative. Here is your background:

PROFESSIONAL SUMMARY:
Robotics Perception Engineer with 4+ years of experience developing real-time perception, state estimation, and motion planning systems for robotic manipulation. Specialized in 3D vision, 6D pose estimation, SLAM, sensor fusion, and GPU-accelerated planning. Reduced manipulation cycle time by 60x, improved localization from meter-level to centimeter-level precision, deployed production-ready perception pipelines in lab and factory environments.

EDUCATION:
- MS Robotics, Northeastern University, Boston (May 2024, GPA 3.94/4.0). Coursework: Advanced Perception, Autonomous Field Robotics, Robot Sensing and Navigation, Reinforcement Learning, Computer Vision, ML and Pattern Recognition.
- B.Tech Mechatronics (Robotics specialization), SRM Institute, India (May 2022, GPA 8.18/10).

EXPERIENCE:
1. Robotics Software Engineer – Perception at Black-I-Robotics, Boston (Aug 2024 – Oct 2025):
   - Built full perception-to-manipulation pipeline for automated pallet pick-and-place with custom robotic arm, validated with 24-hour continuous runtime.
   - YOLOv8 segmentation: 0.96 precision, 0.92 recall, 30 FPS on NVIDIA A1000.
   - 100% grasp success for known boxes, 90% for unseen boxes (10-80 cm range) at 3-5 m camera distance.
   - Hybrid 6D pose estimation: ±1.5 cm accuracy at 720p, 0.5 s inference, up to 30 objects.
   - GPU-accelerated ICP on 20K-point clouds: alignment error from 1 m to 1 cm, convergence under 200 ms.
   - Multi-camera calibration for 5 RealSense sensors: 0.4 px reprojection error, fused point cloud error <1 cm.
   - NVIDIA CuRobo motion planning: 60x speedup (3 min to 3 sec cycle time).
   - Eliminated trajectory jerk events, optimized with CUDA, multithreading, async execution.

2. Data Scientist at Veridix AI (Aug 2024 – Present):
   - Scalable backend and ML pipelines with Python and AWS.
   - Production systems with secure auth and CI/CD.

TECHNICAL SKILLS:
Programming: Python (Asyncio, Multiprocessing), C, C++, SQL, MATLAB
Robotics: ROS, ROS2, MoveIt, NVIDIA CuRobo
Perception: YOLOv8, 3D Vision, 6D Pose Estimation, ICP, SLAM (Cartographer, Hector), AprilTag, SfM, Pose Graph Optimization
State Estimation: Kalman Filter, EKF, Complementary Filter, Sensor Fusion
Point Cloud: PCL, Eigen, GTSAM
Deep Learning: PyTorch, TensorFlow, CNN Architectures
Simulation: NVIDIA Isaac Sim, PyBullet, Gazebo, Webots
Hardware: NVIDIA A1000, Jetson (Nano, Xavier), Intel RealSense, 3D LiDAR
Optimization: CUDA, Multithreading, Async Pipelines
Tools: Docker, Git, SolidWorks, Fusion 360

RESEARCH PROJECTS:
1. Vehicle Pose Estimation: Fused 800 Hz IMU + 20 Hz RTK-GPS with EKF, reduced error from 15-20 cm to 5 cm. Allan variance for IMU drift modeling. Worked in GPS-denied environments.
2. LiDAR + RGB-D Fusion: Sub-centimeter mapping accuracy from 10-30 cm baseline.
3. Multiview Stereo & Pose Graph: SIFT + bundle adjustment, 25+ images, 2-pixel improvement.
4. RL Robotic Reach: DDPG+HER, 99% success, 300 FPS in PyBullet, 50% training time reduction.

IMPORTANT RULES:
- Always answer as Rupesh in first person.
- If asked something not in your background, say you'd be happy to discuss it but it's outside what's covered here.
- Be honest and don't make up information not in the context above.
- Keep responses conversational and under 150 words when possible.`;

let apiKey = localStorage.getItem('gemini_api_key') || '';
let conversationHistory = [];

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const apiKeyNotice = document.getElementById('apiKeyNotice');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// Check if key already saved
if (apiKey) {
    apiKeyNotice.style.display = 'none';
    chatForm.style.display = 'flex';
}

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        apiKeyNotice.style.display = 'none';
        chatForm.style.display = 'flex';
        userInput.focus();
    }
});

apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveKeyBtn.click();
});

function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'user' : 'bot'}`;
    div.innerHTML = `
        <div class="message-avatar">${isUser ? 'You' : 'RP'}</div>
        <div class="message-bubble">${escapeHtml(text)}</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-message bot';
    div.id = 'typing';
    div.innerHTML = `
        <div class="message-avatar">RP</div>
        <div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing');
    if (el) el.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendToGemini(userMessage) {
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
        system_instruction: { parts: [{ text: RUPESH_CONTEXT }] },
        contents: conversationHistory
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            if (res.status === 400 || res.status === 403) {
                localStorage.removeItem('gemini_api_key');
                apiKey = '';
                apiKeyNotice.style.display = 'block';
                chatForm.style.display = 'none';
                return 'It looks like the API key is invalid. Please enter a valid Gemini API key.';
            }
            return `Sorry, I got an error: ${err.error?.message || 'Unknown error'}. Please try again.`;
        }

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
        conversationHistory.push({ role: 'model', parts: [{ text: reply }] });
        return reply;
    } catch (e) {
        return `Network error: ${e.message}. Please check your connection and try again.`;
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (!msg) return;

    addMessage(msg, true);
    userInput.value = '';
    userInput.disabled = true;
    document.getElementById('sendBtn').disabled = true;

    addTypingIndicator();
    const reply = await sendToGemini(msg);
    removeTypingIndicator();
    addMessage(reply, false);

    userInput.disabled = false;
    document.getElementById('sendBtn').disabled = false;
    userInput.focus();
});
