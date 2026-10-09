import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ArrowRight, Brush, Check, CircleHelp, DoorOpen, Eraser, LogOut, Palette, RotateCcw, Trash2, Users, Wifi, WifiOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "whiteboard_token";
const USER_KEY = "whiteboard_user";

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [connected, setConnected] = useState(false);
  const [color, setColor] = useState("#615cf4");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState("pen");
  const [notice, setNotice] = useState("");
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const activeRoomRef = useRef("");
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);
  const toolRef = useRef(tool);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushRef.current = brushSize; }, [brushSize]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { activeRoomRef.current = activeRoom; }, [activeRoom]);

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken("");
        setUser(null);
      });
  }, [token]);

  const drawSegment = useCallback((segment) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = segment.color || "#000000";
    ctx.lineWidth = Number(segment.lineWidth) || 5;
    ctx.beginPath();
    ctx.moveTo(segment.x0, segment.y0);
    ctx.lineTo(segment.x1, segment.y1);
    ctx.stroke();
    ctx.restore();
  }, []);

  const clearCanvasPixels = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const connectSocket = useCallback((authToken) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_URL, { auth: { token: authToken }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnected(false);
      setRoomError(error.message || "Could not connect to the collaboration server.");
    });
    socket.on("room-joined", (roomId) => {
      setActiveRoom(roomId);
      setRoomInput(roomId);
      setRoomBusy(false);
      setRoomError("");
      setNotice(`Joined room ${roomId}`);
    });
    socket.on("load-drawing", (history) => {
      clearCanvasPixels();
      history.forEach(drawSegment);
    });
    socket.on("draw", drawSegment);
    socket.on("clear", clearCanvasPixels);
    socket.on("app-error", (message) => setRoomError(message));
    socket.on("user-joined", (payload) => setNotice(`${payload.name || "A collaborator"} joined the room`));
    return socket;
  }, [clearCanvasPixels, drawSegment]);

  useEffect(() => {
    if (token) connectSocket(token);
    else {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token, connectSocket]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = authMode === "register"
        ? authForm
        : { email: authForm.email, password: authForm.password };
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthError("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    socketRef.current?.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
    setActiveRoom("");
    setRoomInput("");
    clearCanvasPixels();
  }

  function joinRoom(event) {
    event.preventDefault();
    const roomId = roomInput.trim();
    if (!roomId) {
      setRoomError("Enter a room name first.");
      return;
    }
    if (!socketRef.current?.connected) {
      setRoomError("Connecting to the server. Please wait a moment and try again.");
      return;
    }
    setRoomError("");
    setRoomBusy(true);
    clearCanvasPixels();
    socketRef.current.emit("join-room", roomId, (result) => {
      if (!result?.ok) {
        setRoomBusy(false);
        setRoomError(result?.message || "Could not join room.");
      }
    });
  }

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDrawing(event) {
    if (!activeRoomRef.current) {
      setRoomError("Join a room before drawing.");
      return;
    }
    if (event.button !== 0) return;
    const point = getCanvasPoint(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    canvasRef.current.setPointerCapture?.(event.pointerId);
  }

  function moveDrawing(event) {
    if (!drawingRef.current || !lastPointRef.current || !activeRoomRef.current) return;
    const point = getCanvasPoint(event);
    const previous = lastPointRef.current;
    const drawingColor = toolRef.current === "eraser" ? "#ffffff" : colorRef.current;
    const width = toolRef.current === "eraser" ? Math.max(12, brushRef.current * 3) : brushRef.current;
    const segment = {
      roomId: activeRoomRef.current,
      x0: previous.x, y0: previous.y, x1: point.x, y1: point.y,
      color: drawingColor, lineWidth: width
    };
    drawSegment(segment);
    socketRef.current?.emit("draw", segment);
    lastPointRef.current = point;
  }

  function stopDrawing() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearBoard() {
    if (!activeRoomRef.current) {
      setRoomError("Join a room before clearing the board.");
      return;
    }
    if (!window.confirm("Clear this shared board for everyone?")) return;
    socketRef.current?.emit("clear");
    clearCanvasPixels();
  }

  if (!token || !user) {
    return (
      <main className="auth-page">
        <section className="auth-art">
          <div className="brand brand-light"><span className="brand-mark"><Brush size={21} /></span> canvasly</div>
          <div className="art-copy">
            <span className="eyebrow">THINK TOGETHER</span>
            <h1>Big ideas start<br />with a blank canvas.</h1>
            <p>Sketch, plan, and create together in real time — wherever your team is.</p>
          </div>
          <div className="art-canvas" aria-hidden="true">
            <span className="shape shape-one"></span><span className="shape shape-two"></span>
            <span className="shape shape-three"></span><span className="scribble">ideas → action</span>
            <span className="mini-note">make space<br />for ideas ✳</span>
          </div>
          <div className="art-footer">A little space to think out loud.</div>
        </section>
        <section className="auth-panel">
          <div className="mobile-brand brand"><span className="brand-mark"><Brush size={20} /></span> canvasly</div>
          <div className="auth-card">
            <div className="auth-kicker">{authMode === "register" ? "YOUR CREATIVE SPACE" : "WELCOME BACK"}</div>
            <h2>{authMode === "register" ? "Create your account" : "Sign in to Canvasly"}</h2>
            <p className="muted">{authMode === "register" ? "A few details and you're ready to collaborate." : "Pick up where your ideas left off."}</p>
            <form onSubmit={submitAuth} className="auth-form">
              {authMode === "register" && <label>Full name<input autoComplete="name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" minLength={2} maxLength={80} required /></label>}
              <label>Email address<input type="email" autoComplete="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" required /></label>
              <label>Password<input type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder={authMode === "register" ? "At least 8 characters" : "Enter your password"} minLength={authMode === "register" ? 8 : undefined} maxLength={128} required /></label>
              {authError && <div className="error-message" role="alert">{authError}</div>}
              <button className="primary-btn auth-submit" type="submit" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "register" ? "Create account" : "Sign in"} <ArrowRight size={17} /></button>
            </form>
            <div className="auth-switch">{authMode === "register" ? "Already have an account?" : "New to Canvasly?"} <button type="button" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}>{authMode === "register" ? "Sign in" : "Create an account"}</button></div>
            <div className="secure-note"><Check size={15} /> Your work is saved to your connected workspace.</div>
          </div>
          <div className="panel-bottom">Made for curious minds <span>✳</span></div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Brush size={20} /></span> canvasly <span className="brand-divider">/</span><span className="product-label">Whiteboard</span></div>
        <div className="topbar-right">
          <span className={`connection-pill ${connected ? "online" : ""}`}><span className="status-dot"></span>{connected ? "Connected" : "Connecting…"}</span>
          <div className="user-chip"><span className="avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</span><span>{user.name}</span></div>
          <button className="icon-button logout-btn" title="Log out" onClick={logout}><LogOut size={17} /></button>
        </div>
      </header>

      <section className="workspace-heading">
        <div><div className="eyebrow">YOUR SHARED SPACE</div><h1>{activeRoom || "Your next big idea"}</h1><p>{activeRoom ? "Everyone in this room can draw on the same canvas." : "Join a room to start creating with others."}</p></div>
        <form className="join-form" onSubmit={joinRoom}>
          <label htmlFor="room-name">ROOM ID</label>
          <div className="join-controls"><input id="room-name" value={roomInput} onChange={(e) => setRoomInput(e.target.value)} placeholder="e.g. ABC123" maxLength={80} /><button className="primary-btn" disabled={roomBusy || !connected}>{roomBusy ? "Joining…" : "Join room"} <ArrowRight size={16} /></button></div>
        </form>
      </section>

      {roomError && <div className="banner error-message" role="alert">{roomError}</div>}
      {notice && !roomError && <div className="banner notice-message" role="status">{notice}</div>}

      <section className="board-shell">
        <div className="board-toolbar">
          <div className="tool-group"><span className="toolbar-label">TOOLS</span>
            <button className={`tool-btn ${tool === "pen" ? "selected" : ""}`} onClick={() => setTool("pen")} title="Pen"><Brush size={17} /><span>Pen</span></button>
            <button className={`tool-btn ${tool === "eraser" ? "selected" : ""}`} onClick={() => setTool("eraser")} title="Eraser"><Eraser size={17} /><span>Eraser</span></button>
          </div>
          <div className="toolbar-separator"></div>
          <div className="tool-group color-group"><label className="toolbar-label" htmlFor="brush-color">COLOR</label><input id="brush-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Choose pen color" /><span className="color-value">{color.toUpperCase()}</span></div>
          <div className="toolbar-separator"></div>
          <div className="size-control"><label className="toolbar-label" htmlFor="brush-size">SIZE <b>{brushSize}px</b></label><input id="brush-size" type="range" min="1" max="24" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} /></div>
          <div className="toolbar-spacer"></div>
          <button className="clear-btn" onClick={clearBoard}><Trash2 size={16} /> Clear board</button>
        </div>
        <div className="canvas-wrap">
          {!activeRoom && <div className="canvas-empty"><div className="empty-icon"><Palette size={25} /></div><h3>Your canvas is ready</h3><p>Enter a room ID above to join a shared whiteboard.</p></div>}
          <canvas ref={canvasRef} className="drawing-canvas" width={1200} height={650} onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} aria-label="Collaborative whiteboard" />
        </div>
        <footer className="board-footer"><span><Users size={15} /> Room collaboration</span><span><span className="footer-dot"></span>{activeRoom ? `Room: ${activeRoom}` : "No room joined"}</span><span><CircleHelp size={15} /> Draw with your mouse or touch</span></footer>
      </section>
      <div className="workspace-footnote"><span><Wifi size={14} /> Live collaboration</span><span><DoorOpen size={14} /> Share the room ID with collaborators</span><span><RotateCcw size={14} /> Drawings persist in MongoDB</span></div>
    </main>
  );
}
