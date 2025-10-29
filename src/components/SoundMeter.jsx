import React, { useCallback, useEffect, useRef, useState } from 'react';
import LevelIndicator from './LevelIndicator';

export default function SoundMeter() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [smoothing, setSmoothing] = useState(0.7);
  const [sensitivity, setSensitivity] = useState(0.6); // scale visual gain
  const [db, setDb] = useState(-Infinity);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState('');

  const enumerate = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter(d => d.kind === 'audioinput');
      setDevices(mics);
      if (!deviceId && mics[0]?.deviceId) setDeviceId(mics[0].deviceId);
    } catch (e) {
      // ignore
    }
  }, [deviceId]);

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      enumerate();
      navigator.mediaDevices.addEventListener?.('devicechange', enumerate);
      return () => navigator.mediaDevices.removeEventListener?.('devicechange', enumerate);
    }
  }, [enumerate]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (analyserRef.current) analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }

    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async (id) => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: id ? { exact: id } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = smoothing;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // start visualization
      visualize();
      setRunning(true);
      await enumerate();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Microphone access failed');
      stop();
    }
  }, [enumerate, smoothing, stop]);

  const visualize = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(analyser.fftSize);
    const freqArray = new Uint8Array(bufferLength);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.scale(1,1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0,0,canvas.width,canvas.height);

      // time domain for RMS / dB
      if (analyser.getFloatTimeDomainData) analyser.getFloatTimeDomainData(dataArray);
      else {
        const tmp = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(tmp);
        for (let i=0;i<tmp.length;i++) dataArray[i] = (tmp[i] - 128) / 128;
      }

      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) sumSquares += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const scaled = Math.min(1, rms * (1 + sensitivity * 3));
      const dbVal = 20 * Math.log10(rms || 1e-8);

      setLevel(scaled);
      setDb(dbVal);
      setPeak(p => Math.max(p * 0.97, scaled));

      // frequency bars
      analyser.getByteFrequencyData(freqArray);
      const barCount = Math.max(24, Math.floor(canvas.width / 24));
      const step = Math.floor(freqArray.length / barCount);
      const barWidth = (canvas.width - (barCount - 1) * 4) / barCount;

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += freqArray[i * step + j] || 0;
        const value = sum / step / 255;
        const magnitude = Math.pow(value, 0.9) * (0.35 + sensitivity * 0.9);
        const barHeight = magnitude * canvas.height * 0.92;

        const x = i * (barWidth + 4);
        const y = canvas.height - barHeight;

        // gradient per bar
        const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, '#22c55e');

        ctx.fillStyle = grad;
        const radius = Math.min(8, barWidth / 3);
        roundRect(ctx, x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      // overlay grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1 * dpr;
      const lines = 6;
      for (let l = 1; l < lines; l++) {
        const y = (canvas.height / lines) * l;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    render();
  }, []);

  const roundRect = (ctx, x, y, w, h, r) => {
    const min = Math.min(w, h) / 2;
    const radius = Math.min(r, min);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  };

  const handleToggle = async () => {
    if (running) {
      stop();
    } else {
      await start(deviceId);
    }
  };

  const handleDeviceChange = async (e) => {
    const id = e.target.value;
    setDeviceId(id);
    if (running) {
      stop();
      await start(id);
    }
  };

  useEffect(() => {
    if (analyserRef.current) analyserRef.current.smoothingTimeConstant = smoothing;
  }, [smoothing]);

  return (
    <div id="meter" className="w-full">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 order-2 md:order-1">
          <div className="relative rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur overflow-hidden">
            <canvas ref={canvasRef} className="block w-full h-[320px] sm:h-[420px]" />
            <div className="absolute top-3 left-3 text-xs text-neutral-300 bg-black/40 px-2 py-1 rounded-md border border-white/10">
              Spectrum Visualizer
            </div>
          </div>
        </div>

        <div className="md:col-span-4 order-1 md:order-2 flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Controls</h3>
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${running ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' : 'bg-neutral-800 border-white/10 text-neutral-300'}`}>
                {running ? 'Running' : 'Idle'}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-neutral-300 mb-1">Microphone</label>
                <select
                  value={deviceId}
                  onChange={handleDeviceChange}
                  className="w-full bg-neutral-900 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {devices.length === 0 && <option value="">Default Microphone</option>}
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-1">Sensitivity</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={sensitivity}
                  onChange={e => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-1">Smoothing</label>
                <input
                  type="range"
                  min={0}
                  max={0.95}
                  step={0.01}
                  value={smoothing}
                  onChange={e => setSmoothing(parseFloat(e.target.value))}
                  className="w-full accent-red-500"
                />
              </div>

              <button
                onClick={handleToggle}
                className={`w-full mt-2 rounded-md px-4 py-2.5 font-medium transition-colors ${running ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-red-600 hover:bg-red-500'} `}
              >
                {running ? 'Stop' : 'Start'}
              </button>

              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur p-4">
            <LevelIndicator level={level} db={db} peak={peak} />
          </div>
        </div>
      </div>

      <section id="about" className="mt-10 text-sm text-neutral-300 max-w-3xl">
        <h3 className="text-white font-medium mb-2">About</h3>
        <p>
          This sound meter provides a visual approximation of loudness using your device's microphone. Values are influenced by microphone hardware, browser processing, and environment, and are not calibrated for professional measurement.
        </p>
      </section>
    </div>
  );
}
