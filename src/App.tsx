/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pencil, 
  Lightbulb, 
  Camera, 
  Gamepad2, 
  BarChart3, 
  FileText, 
  ChevronLeft,
  GraduationCap,
  Star,
  Trophy,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  History,
  Calendar,
  MessageCircle,
  Clock,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Play,
  Flag,
  BookOpen,
  MessageSquare,
  Gift,
  Car,
  User as UserIcon,
  Lock,
  LogOut
} from 'lucide-react';
import { Grade, ViewState, Lesson, Question, ChatMessage, HistoryItem, User } from './types';
import { CURRICULUM } from './constants';
import { geminiService } from './services/geminiService';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [grade, setGrade] = useState<Grade>(1);
  const [view, setView] = useState<ViewState>('auth');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', fullName: '', grade: 1 as Grade });
  const [authError, setAuthError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [test, setTest] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('math_tutor_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setGrade(parsedUser.grade);
        setHistory(parsedUser.history || []);
        setChatHistory(parsedUser.chatHistory || []);
        setTotalPoints(parsedUser.points || 0);
        setGameStage(parsedUser.stage || 1);
        setUnlockedItems(parsedUser.unlockedItems || []);
        setView('home');
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  // Sync progress to server
  const syncProgress = async (updatedUser: User) => {
    try {
      await fetch('/api/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updatedUser.id,
          points: updatedUser.points,
          stage: updatedUser.stage,
          unlockedItems: updatedUser.unlockedItems,
          history: updatedUser.history,
          chatHistory: updatedUser.chatHistory
        })
      });
      localStorage.setItem('math_tutor_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Failed to sync progress", error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      if (data.success) {
        if (authMode === 'login') {
          const loggedUser = {
            ...data.user,
            unlockedItems: JSON.parse(data.user.unlockedItems || '[]'),
            history: JSON.parse(data.user.history || '[]'),
            chatHistory: JSON.parse(data.user.chatHistory || '[]')
          };
          setUser(loggedUser);
          setGrade(loggedUser.grade);
          setHistory(loggedUser.history);
          setChatHistory(loggedUser.chatHistory);
          setTotalPoints(loggedUser.points);
          setGameStage(loggedUser.stage);
          setUnlockedItems(loggedUser.unlockedItems);
          localStorage.setItem('math_tutor_user', JSON.stringify(loggedUser));
          setView('home');
        } else {
          setAuthMode('login');
          showNotification("Đăng ký thành công! Hãy đăng nhập nhé.");
        }
      } else {
        setAuthError(data.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      setAuthError("Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('math_tutor_user');
    setView('auth');
  };

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const handleGradeChange = (g: Grade) => {
    setGrade(g);
    setView('home');
    setResponse(null);
    setProblem('');
    if (user) {
      const updatedUser = { ...user, grade: g };
      setUser(updatedUser);
      syncProgress(updatedUser);
    }
  };

  const openCamera = async () => {
    setView('camera');
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Không thể truy cập camera. Con hãy kiểm tra quyền truy cập nhé!");
      setView('problem-input');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const retakePhoto = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    openCamera();
  };

  const confirmPhoto = async () => {
    if (!capturedImage) return;
    const base64 = capturedImage.split(',')[1];
    setUploadedImage(base64);
    setLoading(true);
    setView('photo-discussion');
    try {
      const res = await geminiService.detectAndSolve(base64, grade);
      const initialChat: ChatMessage[] = [
        { role: 'user', text: "Con gửi ảnh bài toán nhờ cô hướng dẫn ạ.", image: base64, timestamp: Date.now() },
        { role: 'model', text: res, timestamp: Date.now() }
      ];
      setChatHistory(initialChat);
      addToHistory({
        type: 'chat',
        title: "Giải toán từ ảnh",
        content: initialChat,
        grade
      });
    } catch (error) {
      console.error(error);
      setChatHistory([{ role: 'model', text: "Cô không đọc được ảnh này, con chụp lại rõ hơn nhé!", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      setCapturedImage(null);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setView('camera'); // Use camera view for preview
    };
    reader.readAsDataURL(file);
  };

  const handleSolveProblem = async () => {
    if (!problem.trim()) return;
    setLoading(true);
    try {
      const res = await geminiService.getProblemGuidance(problem, grade);
      setResponse(res);
      addToHistory({
        type: 'chat',
        title: problem.length > 30 ? problem.substring(0, 30) + "..." : problem,
        content: [
          { role: 'user', text: problem, timestamp: Date.now() },
          { role: 'model', text: res, timestamp: Date.now() }
        ],
        grade
      });
    } catch (error) {
      console.error(error);
      setResponse("Ôi, có lỗi rồi con ạ. Con thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  const handleGetHint = async () => {
    if (!problem.trim()) return;
    setLoading(true);
    try {
      const res = await geminiService.getHint(problem, grade, response || undefined);
      setResponse((prev) => (prev ? prev + "\n\n" + res : res));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedImage(base64);
      try {
        const res = await geminiService.gradePhoto(base64, grade);
        setResponse(res);
        const initialChat: ChatMessage[] = [
          { role: 'user', text: "Con gửi bài làm nhờ cô chấm ạ.", image: base64, timestamp: Date.now() },
          { role: 'model', text: res, timestamp: Date.now() }
        ];
        setChatHistory(initialChat);
        addToHistory({
          type: 'chat',
          title: "Chấm bài từ ảnh",
          content: initialChat,
          grade
        });
        setView('photo-discussion');
      } catch (error) {
        console.error(error);
        setResponse("Cô không đọc được ảnh này, con chụp lại rõ hơn nhé!");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [gameStage, setGameStage] = useState(1);
  const [gameProgress, setGameProgress] = useState(0); // 0 to 4 for 5 questions per stage
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [gameNotification, setGameNotification] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<{name: string, points: number, stage: number, badges: number}[]>([
    { name: 'Minh', points: 520, stage: 52, badges: 5 },
    { name: 'Lan', points: 480, stage: 48, badges: 4 },
    { name: 'Nam', points: 460, stage: 46, badges: 4 },
    { name: 'Hà', points: 420, stage: 42, badges: 4 },
    { name: 'Tuấn', points: 380, stage: 38, badges: 3 },
    { name: 'Linh', points: 350, stage: 35, badges: 3 },
    { name: 'Phong', points: 310, stage: 31, badges: 3 },
    { name: 'Mai', points: 280, stage: 28, badges: 2 },
    { name: 'Đức', points: 250, stage: 25, badges: 2 },
    { name: 'Vân', points: 210, stage: 21, badges: 2 },
  ]);

  // Sync progress to server whenever critical state changes
  useEffect(() => {
    if (user) {
      const updatedUser: User = {
        ...user,
        points: totalPoints,
        stage: gameStage,
        unlockedItems,
        history,
        chatHistory
      };
      syncProgress(updatedUser);
    }
  }, [totalPoints, gameStage, unlockedItems, history, chatHistory]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard", error);
    }
  };

  useEffect(() => {
    if (view === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [view]);

  const showNotification = (msg: string) => {
    setGameNotification(msg);
    setTimeout(() => setGameNotification(null), 3000);
  };

  const startQuiz = async (topic: string) => {
    setLoading(true);
    try {
      const questions = await geminiService.generateQuiz(grade, topic);
      setQuiz(questions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setView('game');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startRace = async (stage: number) => {
    setLoading(true);
    setGameStage(stage);
    setGameProgress(0);
    try {
      // Difficulty increases with stage
      const topic = stage <= 20 ? "Cộng trừ cơ bản" : 
                    stage <= 40 ? "Nhân chia cơ bản" :
                    stage <= 60 ? "Toán đố 1 bước" :
                    stage <= 80 ? "Toán đố nhiều bước" : "Toán tư duy nâng cao";
      
      const questions = await geminiService.generateQuiz(grade, `${topic} (Chặng ${stage})`);
      setQuiz(questions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResult(false);
      setView('game');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const isCorrect = answer === quiz[currentQuestionIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
      setTotalPoints(prev => prev + 10);
      showNotification("Xe của con đã tiến thêm 1 bước! +10 điểm");
      
      if (currentQuestionIndex + 1 < quiz.length) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setShowResult(true);
        const newStage = gameStage + 1;
        setGameStage(newStage);
        
        let treasureMsg = "";
        if (newStage % 10 === 0) {
          const items = ["Huy hiệu Thông thái", "Siêu xe Tia chớp", "Nhân vật Robot Toán học", "Mũ Phù thủy Số học"];
          const newItem = items[Math.floor(Math.random() * items.length)];
          if (!unlockedItems.includes(newItem)) {
            setUnlockedItems(prev => [...prev, newItem]);
            treasureMsg = ` Chúc mừng! Con đã mở được kho báu: ${newItem}!`;
          }
        }
        
        addToHistory({
          type: 'quiz',
          title: `Đường đua Toán - Chặng ${gameStage}: Thắng cuộc!`,
          content: { score: score + 1, total: quiz.length, stage: gameStage },
          grade
        });
        
        showNotification(`Chúc mừng! Con đã vượt qua chặng ${gameStage}!${treasureMsg}`);
      }
    } else {
      // In race mode, wrong answer stops the game
      setShowResult(true);
      addToHistory({
        type: 'quiz',
        title: `Đường đua Toán - Chặng ${gameStage}: Dừng bước`,
        content: { score, total: quiz.length, stage: gameStage },
        grade
      });
      showNotification("Tiếc quá! Con hãy thử lại chặng này nhé.");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !uploadedImage) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput('');
    setLoading(true);
    
    try {
      const res = await geminiService.discussPhoto(uploadedImage, grade, newHistory, chatInput);
      const assistantMsg: ChatMessage = { role: 'model', text: res, timestamp: Date.now() };
      const updatedHistory = [...newHistory, assistantMsg];
      setChatHistory(updatedHistory);
      
      // Update the history item for this session
      setHistory(prev => {
        const lastItem = prev[0];
        if (lastItem && lastItem.type === 'chat' && lastItem.title === "Chấm bài từ ảnh") {
          const updated = [...prev];
          updated[0] = { ...lastItem, content: updatedHistory };
          return updated;
        }
        return prev;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateTest = async (type: 'topic' | 'midterm' | 'final') => {
    setLoading(true);
    try {
      const res = await geminiService.generateTest(grade, type);
      setTest(res);
      setView('test-generator');
      addToHistory({
        type: 'test',
        title: res.title,
        content: res,
        grade
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const groupHistoryByDate = () => {
    const groups: { [key: string]: HistoryItem[] } = {
      'Hôm nay': [],
      'Hôm qua': [],
      'Trước đó': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    history.forEach(item => {
      if (item.timestamp >= today) {
        groups['Hôm nay'].push(item);
      } else if (item.timestamp >= yesterday) {
        groups['Hôm qua'].push(item);
      } else {
        groups['Trước đó'].push(item);
      }
    });

    return groups;
  };

  const handleReopenHistory = (item: HistoryItem) => {
    if (item.type === 'chat') {
      setChatHistory(item.content);
      // Find the image if it exists in the chat
      const imageMsg = item.content.find((m: ChatMessage) => m.image);
      if (imageMsg) {
        setUploadedImage(imageMsg.image);
        setView('photo-discussion');
      } else {
        // If no image, it was a text problem guidance
        setProblem(item.content[0].text);
        setResponse(item.content[1].text);
        setView('problem-input');
      }
    } else if (item.type === 'quiz') {
      // For quiz, we just show the result for now or we could restart it
      startQuiz(item.title.split(': ')[0]);
    } else if (item.type === 'test') {
      setTest(item.content);
      setView('test-generator');
    }
  };

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] card-shadow w-full max-w-md space-y-8 border-4 border-blue-50"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-blue-600 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-800">Gia sư Toán AI</h2>
          <p className="text-slate-500 font-bold">
            {authMode === 'login' ? 'Chào mừng con quay trở lại!' : 'Đăng ký để bắt đầu học nhé!'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">Họ và tên</label>
              <input 
                type="text" 
                required
                placeholder="Nhập họ và tên của con"
                className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                value={authForm.fullName}
                onChange={(e) => setAuthForm({...authForm, fullName: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">Tên đăng nhập</label>
            <input 
              type="text" 
              required
              placeholder="Nhập tên đăng nhập"
              className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
              value={authForm.username}
              onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">Mật khẩu</label>
            <input 
              type="password" 
              required
              placeholder="Nhập mật khẩu"
              className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
            />
          </div>

          {authMode === 'register' && (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase ml-2">Lớp</label>
              <select 
                className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                value={authForm.grade}
                onChange={(e) => setAuthForm({...authForm, grade: parseInt(e.target.value) as Grade})}
              >
                {[1, 2, 3, 4, 5].map(g => (
                  <option key={g} value={g}>Lớp {g}</option>
                ))}
              </select>
            </div>
          )}

          {authError && (
            <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl">
              {authError}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full primary-gradient text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ')}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="text-blue-600 font-bold text-sm hover:underline"
          >
            {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
          <ChevronLeft size={20} /> Quay lại
        </button>
        <h3 className="text-xl font-bold text-slate-800">Bảng xếp hạng lớp</h3>
        <div className="w-20"></div>
      </div>

      <div className="bg-white rounded-3xl card-shadow overflow-hidden">
        <div className="primary-gradient p-6 text-white text-center">
          <Trophy className="w-12 h-12 mx-auto mb-2" />
          <h4 className="text-2xl font-black">TOP 10 ĐUA TOP</h4>
          <p className="opacity-80 text-sm">Cùng thi đua với các bạn nào!</p>
        </div>

        <div className="p-4">
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-4 rounded-2xl ${
                  index === 0 ? 'bg-yellow-50 border-2 border-yellow-200' : 
                  index === 1 ? 'bg-slate-50 border-2 border-slate-200' :
                  index === 2 ? 'bg-orange-50 border-2 border-orange-200' : 'bg-white border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                    index === 0 ? 'bg-yellow-400 text-white' : 
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{player.name}</p>
                    <p className="text-xs text-slate-500">Chặng {player.stage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-600">{player.points}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Điểm</p>
                </div>
              </div>
            ))}
            
            {/* Current User Row */}
            <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-100">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
                    ?
                  </div>
                  <div>
                    <p className="font-bold">{user?.fullName} (Con)</p>
                    <p className="text-xs opacity-80">Chặng {gameStage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl">{totalPoints}</p>
                  <p className="text-[10px] opacity-80 uppercase font-bold">Điểm của con</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6">
      {/* User Greeting */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800">Xin chào, {user?.fullName.split(' ').pop()}! 👋</h2>
          <p className="text-slate-500 font-bold text-sm">Hôm nay con muốn luyện tập bài toán nào?</p>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Race Progress Card */}
      <div className="bg-white p-6 rounded-3xl card-shadow border-2 border-pink-100 relative overflow-hidden group cursor-pointer" onClick={() => setView('game')}>
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
          <Gamepad2 size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Đường đua Toán học</span>
              <h3 className="text-2xl font-black text-slate-800">Chặng {gameStage}/100</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-blue-600">{totalPoints}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng điểm</p>
            </div>
          </div>
          
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-2 relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(gameStage / 100) * 100}%` }}
              className="h-full primary-gradient"
            />
            <motion.div
              initial={{ left: 0 }}
              animate={{ left: `${(gameStage / 100) * 100}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
            >
              <div className="bg-white p-1 rounded-full shadow-md border border-pink-200">
                <Car size={12} className="text-pink-600" />
              </div>
            </motion.div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Bắt đầu</span>
            <span>Đích (Chặng 100)</span>
          </div>
        </div>
      </div>

      {/* Unlocked Treasures */}
      {unlockedItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-black text-slate-800 flex items-center gap-2 px-2">
            <Gift size={18} className="text-pink-500" /> KHO BÁU ĐÃ MỞ
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-2 px-2 no-scrollbar">
            {unlockedItems.map((item, idx) => (
              <div key={idx} className="flex-shrink-0 bg-pink-50 border-2 border-pink-100 p-3 rounded-2xl flex flex-col items-center gap-1 min-w-[100px]">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Star className="text-pink-500" size={20} />
                </div>
                <p className="text-[10px] font-black text-pink-700 text-center uppercase">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MenuButton 
          icon={<Pencil className="w-8 h-8" />} 
          label="Nhập bài toán" 
          color="bg-blue-500" 
          onClick={() => setView('problem-input')} 
        />
        <MenuButton 
          icon={<Lightbulb className="w-8 h-8" />} 
          label="Gợi ý cách giải" 
          color="bg-yellow-500" 
          onClick={() => setView('problem-input')} 
        />
        <MenuButton 
          icon={<Camera className="w-8 h-8" />} 
          label="Chấm bài từ ảnh" 
          color="bg-purple-500" 
          onClick={() => setView('photo-grader')} 
        />
        <MenuButton 
          icon={<Gamepad2 className="w-8 h-8" />} 
          label="Đường đua Toán" 
          color="bg-pink-500" 
          onClick={() => setView('game')} 
        />
        <MenuButton 
          icon={<Trophy className="w-8 h-8" />} 
          label="Bảng xếp hạng" 
          color="bg-amber-500" 
          onClick={() => setView('leaderboard')} 
        />
        <MenuButton 
          icon={<BarChart3 className="w-8 h-8" />} 
          label="Luyện tập" 
          color="bg-green-500" 
          onClick={() => setView('lessons')} 
        />
        <MenuButton 
          icon={<FileText className="w-8 h-8" />} 
          label="Tạo đề kiểm tra" 
          color="bg-orange-500" 
          onClick={() => setView('test-generator')} 
        />
        <MenuButton 
          icon={<History className="w-8 h-8" />} 
          label="Lịch sử học tập" 
          color="bg-slate-600" 
          onClick={() => setView('history')} 
        />
      </div>

      {unlockedItems.length > 0 && (
        <div className="bg-white p-6 rounded-3xl card-shadow border-2 border-yellow-100">
          <h4 className="text-sm font-black text-yellow-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Star size={16} /> Kho báu của con
          </h4>
          <div className="flex flex-wrap gap-2">
            {unlockedItems.map((item, i) => (
              <span key={i} className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                🎁 {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <header className="primary-gradient text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <GraduationCap size={120} />
        </div>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-2xl shadow-inner">
              <GraduationCap className="text-blue-600 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gia sư Toán Tiểu học AI</h1>
              <p className="text-blue-100 text-sm">Cô luôn đồng hành cùng con!</p>
            </div>
          </div>
          
          <div className="flex bg-white/20 p-1 rounded-2xl backdrop-blur-sm">
            {[1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                onClick={() => handleGradeChange(g as Grade)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  grade === g ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-white/10'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4">
        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {renderAuth()}
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Xin chào, {user?.fullName || 'con yêu'}! 👋</h2>
                <p className="text-slate-500">Hôm nay con muốn học gì nào?</p>
              </div>
              {renderHome()}
            </motion.div>
          )}

          {view === 'problem-input' && (
            <motion.div
              key="problem-input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>
              <div className="bg-white p-6 rounded-3xl card-shadow space-y-4 border-2 border-blue-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Pencil className="text-blue-500" /> Nhập bài toán của con
                </h3>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Ví dụ: Có 5 quả táo, mẹ cho thêm 3 quả. Hỏi có tất cả bao nhiêu quả táo?"
                  className="w-full h-32 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-400 focus:ring-0 transition-all resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSolveProblem}
                    disabled={loading || !problem.trim()}
                    className="flex-1 primary-gradient text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Cô ơi, giúp con!"}
                  </button>
                  <button
                    onClick={handleGetHint}
                    disabled={loading || !problem.trim()}
                    className="px-6 bg-yellow-400 text-white rounded-2xl font-bold shadow-lg shadow-yellow-100 disabled:opacity-50"
                  >
                    Gợi ý
                  </button>
                </div>

                <div className="pt-4 border-t-2 border-slate-50">
                  <p className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Hoặc gửi ảnh bài tập</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={openCamera}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-purple-50 text-purple-600 font-bold border-2 border-purple-100 hover:bg-purple-100 transition-all"
                    >
                      <Camera size={20} /> Chụp ảnh bài tập
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 text-blue-600 font-bold border-2 border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      <ImageIcon size={20} /> Tải ảnh từ máy
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleGalleryUpload} 
                    />
                  </div>
                </div>
              </div>

              {response && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-3xl card-shadow border-2 border-green-100 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Star size={48} className="text-yellow-500" />
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{response}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'photo-discussion' && (
            <motion.div
              key="photo-discussion"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Section */}
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-3xl card-shadow border-2 border-purple-100 sticky top-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Camera size={20} className="text-purple-500" /> Bài làm của con
                    </h3>
                    {uploadedImage && (
                      <img 
                        src={`data:image/jpeg;base64,${uploadedImage}`} 
                        alt="Bài làm" 
                        className="w-full rounded-2xl border border-slate-100 shadow-inner"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>

                {/* Chat Section */}
                <div className="space-y-4 flex flex-col h-[600px]">
                  <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-white rounded-3xl card-shadow border-2 border-blue-50">
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-700 font-medium text-sm mb-4">
                      Cô cùng xem lại bài của con nhé. Con có thắc mắc gì cứ hỏi cô nha!
                    </div>
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                          {msg.image && (
                            <img 
                              src={`data:image/jpeg;base64,${msg.image}`} 
                              alt="Nội dung gửi" 
                              className="w-full rounded-xl mb-3 border border-white/20"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-sm text-slate-500">Cô đang trả lời...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-3xl card-shadow border-2 border-blue-100 flex gap-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                      placeholder="Con muốn hỏi gì cô nào?"
                      className="flex-1 bg-slate-50 border-none focus:ring-0 rounded-xl px-4"
                    />
                    <button 
                      onClick={handleChat}
                      disabled={loading || !chatInput.trim()}
                      className="primary-gradient text-white p-3 rounded-xl shadow-md disabled:opacity-50"
                    >
                      Gửi cô
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {view === 'photo-grader' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>
              <div className="bg-white p-8 rounded-3xl card-shadow border-2 border-dashed border-purple-200 text-center space-y-4">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="text-purple-600 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Chụp ảnh bài làm của con</h3>
                <p className="text-slate-500">Cô sẽ giúp con kiểm tra xem con làm đúng chưa nhé!</p>
                <label className="inline-block cursor-pointer primary-gradient text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-200">
                  <span className="flex items-center gap-2">
                    <Upload size={20} /> Chọn ảnh bài làm
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              {loading && (
                <div className="text-center py-12 space-y-4">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
                  <p className="text-slate-600 font-medium">Cô đang xem bài của con, chờ cô xíu nhé...</p>
                </div>
              )}

              {response && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-3xl card-shadow border-2 border-purple-100"
                >
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{response}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'leaderboard' && renderLeaderboard()}
          {view === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>

              {gameNotification && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-2xl border-2 border-white/20 whitespace-nowrap"
                >
                  {gameNotification}
                </motion.div>
              )}

              {quiz.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl card-shadow space-y-8">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
                      <Gamepad2 className="text-pink-600 w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">Bản đồ Đường đua</h3>
                    <p className="text-slate-500">Vượt qua 100 chặng để trở thành Vua Toán học!</p>
                  </div>

                  <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2">
                    {Array.from({ length: 100 }).map((_, i) => {
                      const stageNum = i + 1;
                      const isLocked = stageNum > gameStage;
                      const isCompleted = stageNum < gameStage;
                      const isCurrent = stageNum === gameStage;
                      const isTreasure = stageNum % 10 === 0;

                      return (
                        <button
                          key={i}
                          disabled={isLocked}
                          onClick={() => startRace(stageNum)}
                          className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                            isCurrent ? 'bg-pink-500 text-white shadow-lg shadow-pink-200 scale-110 z-10' :
                            isCompleted ? 'bg-green-100 text-green-600' :
                            'bg-slate-50 text-slate-300'
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                          <span className="text-xs font-black">{stageNum}</span>
                          {isTreasure && (
                            <div className="absolute -top-1 -right-1">
                              <Star size={12} className={isCompleted ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'} />
                            </div>
                          )}
                          {isCurrent && (
                            <div className="absolute -bottom-1">
                              <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Ghi chú đường đua</h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500 rounded-full" /> Chặng hiện tại</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-100 rounded-full" /> Đã hoàn thành</div>
                      <div className="flex items-center gap-1"><Star size={10} className="text-yellow-500" /> Kho báu (mỗi 10 chặng)</div>
                    </div>
                  </div>
                </div>
              ) : showResult ? (
                <div className="bg-white p-12 rounded-3xl card-shadow text-center space-y-6 border-4 border-pink-100">
                  <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {score === quiz.length ? (
                      <Trophy className="text-yellow-600 w-12 h-12" />
                    ) : (
                      <Star className="text-yellow-600 w-12 h-12" />
                    )}
                  </div>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {score === quiz.length ? 'TUYỆT VỜI!' : 'CỐ GẮNG LÊN!'}
                  </h3>
                  <p className="text-xl text-slate-600">Con đã đạt được <span className="text-pink-600 font-black text-4xl">{score}/{quiz.length}</span> điểm!</p>
                  
                  <div className="flex flex-col gap-3">
                    {score === quiz.length && gameStage < 100 ? (
                      <button 
                        onClick={() => startRace(gameStage + 1)}
                        className="w-full primary-gradient text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                      >
                        Sang Chặng {gameStage + 1} <ChevronLeft className="rotate-180" size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => startRace(gameStage)}
                        className="w-full primary-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                      >
                        Thử lại chặng này
                      </button>
                    )}
                    <button 
                      onClick={() => setView('home')}
                      className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold"
                    >
                      Về trang chủ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl card-shadow space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Chặng {gameStage}</span>
                      <span className="bg-pink-100 text-pink-600 px-4 py-1 rounded-full font-bold text-sm">
                        Câu {currentQuestionIndex + 1} / {quiz.length}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {quiz.map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-3 h-3 rounded-full ${i <= currentQuestionIndex ? 'bg-pink-500' : 'bg-pink-100'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 leading-tight">
                    {quiz[currentQuestionIndex].text}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {quiz[currentQuestionIndex].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        className="p-5 rounded-2xl border-2 border-slate-100 hover:border-pink-400 hover:bg-pink-50 transition-all text-left font-bold text-slate-700 flex items-center gap-4 group"
                      >
                        <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'lessons' && (
            <motion.div
              key="lessons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>
              <div className="bg-white p-6 rounded-3xl card-shadow space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="text-green-500" /> Luyện tập theo bài học
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CURRICULUM[grade].map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => startQuiz(lesson.title)}
                      className="p-6 rounded-2xl bg-green-50 border-2 border-green-100 hover:border-green-400 transition-all text-left group"
                    >
                      <h4 className="font-bold text-slate-800 text-lg group-hover:text-green-600">{lesson.title}</h4>
                      <p className="text-green-600 text-sm font-medium mt-1">Bắt đầu luyện tập →</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'test-generator' && (
            <motion.div
              key="test-generator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>

              {!test ? (
                <div className="bg-white p-8 rounded-3xl card-shadow space-y-6">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-orange-600 w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 text-center">Tạo đề kiểm tra</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <TestOption 
                      title="Đề kiểm tra theo chủ đề" 
                      desc="Luyện tập sâu một kiến thức cụ thể"
                      onClick={() => generateTest('topic')}
                    />
                    <TestOption 
                      title="Đề kiểm tra giữa kỳ" 
                      desc="Tổng hợp kiến thức nửa học kỳ"
                      onClick={() => generateTest('midterm')}
                    />
                    <TestOption 
                      title="Đề kiểm tra cuối kỳ" 
                      desc="Tổng hợp kiến thức cả học kỳ"
                      onClick={() => generateTest('final')}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-3xl card-shadow space-y-8 border-2 border-orange-100">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest">{test.title}</h3>
                    <p className="text-slate-500 font-bold">Môn: Toán - Lớp {grade}</p>
                    <div className="h-1 w-24 bg-orange-400 mx-auto rounded-full" />
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-orange-600 flex items-center gap-2">
                      <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">I</span>
                      PHẦN TRẮC NGHIỆM
                    </h4>
                    {test.questions.map((q: any, i: number) => (
                      <div key={q.id} className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                        <p className="font-bold text-slate-800">Câu {i + 1}: {q.text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-slate-600">
                              <span className="font-bold">{String.fromCharCode(65 + idx)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-orange-600 flex items-center gap-2">
                      <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">II</span>
                      PHẦN TỰ LUẬN
                    </h4>
                    {test.essayQuestions.map((q: string, i: number) => (
                      <div key={i} className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                        <p className="font-bold text-slate-800">Câu {i + 1}: {q}</p>
                        <div className="h-24 border-b-2 border-dashed border-slate-300" />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => window.print()}
                    className="w-full primary-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                  >
                    In đề kiểm tra
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60] flex flex-col"
            >
              <div className="p-4 flex justify-between items-center text-white z-10">
                <button 
                  onClick={() => {
                    if (stream) {
                      stream.getTracks().forEach(track => track.stop());
                      setStream(null);
                    }
                    setView('problem-input');
                  }}
                  className="p-2 bg-white/10 rounded-full"
                >
                  <ChevronLeft size={24} />
                </button>
                <h3 className="font-bold">Gửi ảnh bài tập</h3>
                <div className="w-10" />
              </div>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {!capturedImage ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                      <div className="w-full aspect-[4/3] border-2 border-white/50 rounded-2xl" />
                    </div>
                  </>
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Xem trước" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="p-8 bg-black/80 backdrop-blur-md flex justify-center items-center gap-8">
                {!capturedImage ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white border-8 border-white/20 flex items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-full border-4 border-black/10" />
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={retakePhoto}
                      className="flex flex-col items-center gap-2 text-white"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                        <RotateCcw size={28} />
                      </div>
                      <span className="text-xs font-bold">Chụp lại</span>
                    </button>
                    <button 
                      onClick={confirmPhoto}
                      className="flex flex-col items-center gap-2 text-white"
                    >
                      <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                        <Check size={36} />
                      </div>
                      <span className="text-xs font-bold">Gửi cô</span>
                    </button>
                  </>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}
          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center text-blue-600 font-bold gap-1">
                <ChevronLeft size={20} /> Quay lại
              </button>

              <div className="bg-white p-6 rounded-3xl card-shadow space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <History className="text-slate-600" /> Lịch sử học tập
                </h3>

                {history.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="text-slate-400" />
                    </div>
                    <p className="text-slate-500">Con chưa có lịch sử học tập nào. Hãy bắt đầu học nhé!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          if (confirm("Con có chắc chắn muốn xóa hết lịch sử không?")) {
                            setHistory([]);
                            localStorage.removeItem('math_tutor_history');
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        Xóa tất cả lịch sử
                      </button>
                    </div>
                    {Object.entries(groupHistoryByDate()).map(([date, items]) => (
                      items.length > 0 && (
                        <div key={date} className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Calendar size={14} /> {date}
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            {items.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleReopenHistory(item)}
                                className="w-full text-left p-4 rounded-2xl border-2 border-slate-50 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-4 group relative overflow-hidden"
                              >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                  item.type === 'chat' ? 'bg-blue-100 text-blue-600' :
                                  item.type === 'quiz' ? 'bg-pink-100 text-pink-600' :
                                  'bg-orange-100 text-orange-600'
                                }`}>
                                  {item.type === 'chat' ? <MessageCircle size={24} /> :
                                   item.type === 'quiz' ? <Trophy size={24} /> :
                                   <FileText size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-bold text-slate-800 truncate group-hover:text-blue-600">{item.title}</h5>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                      <Clock size={10} /> {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
                                      Lớp {item.grade}
                                    </span>
                                  </div>
                                </div>
                                <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-blue-400 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Loading Overlay */}
      {loading && view !== 'photo-grader' && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4 border-2 border-blue-100">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-700 font-bold">Cô đang suy nghĩ, con chờ cô xíu nhé...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white p-6 rounded-3xl shadow-lg hover:scale-105 transition-transform flex flex-col items-center justify-center gap-4 text-center aspect-square`}
    >
      {icon}
      <span className="font-bold text-lg leading-tight">{label}</span>
    </button>
  );
}

function TestOption({ title, desc, onClick }: { title: string, desc: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-6 rounded-2xl border-2 border-orange-50 hover:border-orange-400 hover:bg-orange-50 transition-all text-left flex justify-between items-center group"
    >
      <div>
        <h4 className="font-bold text-slate-800 text-lg group-hover:text-orange-600">{title}</h4>
        <p className="text-slate-500 text-sm">{desc}</p>
      </div>
      <ChevronLeft className="rotate-180 text-orange-400" />
    </button>
  );
}

