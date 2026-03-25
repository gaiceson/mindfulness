/**
 * 명상 카테고리별 사운드 엔진 — MP3 파일 기반
 */

export type SessionCategory = 'stress' | 'sleep' | 'focus' | 'anxiety' | 'breath' | 'morning' | 'love';

export interface SoundProfile {
  label: string;
  emoji: string;
  description: string;
}

export const CATEGORY_SOUND_PROFILES: Record<SessionCategory, SoundProfile> = {
  stress:  { label: '빗소리',        emoji: '🌧',  description: '은은한 빗소리로 긴장을 내려놓아요' },
  sleep:   { label: '파도소리',      emoji: '🌊',  description: '느리게 밀려오는 파도로 잠에 들어요' },
  focus:   { label: '바이노럴 비트', emoji: '🎯',  description: '10Hz 알파파로 맑은 집중 상태예요' },
  anxiety: { label: '시냇물소리',    emoji: '💧',  description: '졸졸 흐르는 물소리로 불안을 흘려요' },
  breath:  { label: '가이드 명상',   emoji: '🌬',  description: '호흡 리듬에 맞춤 가이드 소리예요' },
  morning: { label: '새소리',        emoji: '🌅',  description: '맑은 새소리로 상쾌한 아침을 열어요' },
  love:    { label: '싱잉볼',        emoji: '💜',  description: '528Hz 싱잉볼이 마음을 감싸요' },
};

// ── 세션 ID → 사운드 파일 매핑 ───────────────────────────────────────────
// 카테고리 기본값 fallback 포함
const SESSION_SOUND_MAP: Record<string, string> = {
  // 아침 명상
  '1':  'morning.mp3',   // 하루의 시작, 고요한 아침
  '29': 'thanks.mp3',    // 감사 일기로 하루 시작
  '30': 'morning2.mp3',  // 오늘 하루 의도 설정하기

  // 스트레스
  '2':  'stress.mp3',    // 재정 스트레스 내려놓기
  '11': 'stress2.mp3',   // 월말 결제일 전날 밤 (창문 빗소리)
  '12': 'stress.mp3',    // 직장 상사에게 치인 하루
  '13': 'stress2.mp3',   // 비교하는 마음 놓아주기
  '14': 'stress.mp3',    // 번아웃 직전, 잠깐 쉬어가요

  // 수면
  '3':  'sleep.mp3',     // 깊은 수면을 위한 바디 스캔
  '15': 'sleep2.mp3',    // 잠들기 전 5분 릴렉스
  '16': 'sleep3.mp3',    // 새벽에 깨서 다시 잠들기
  '17': 'sleep.mp3',     // 오늘 하루의 무게 내려놓기
  '18': 'sleep2.mp3',    // 45분 깊은 수면 가이드

  // 호흡
  '4':  'breath.mp3',    // 4-7-8 호흡으로 마음 안정
  '8':  'breath.mp3',    // 박스 브리딩으로 스트레스 해소
  '26': 'breath2.mp3',   // 1분 긴급 진정 호흡
  '27': 'breath.mp3',    // 코히런트 브리딩
  '28': 'breath2.mp3',   // 복식 호흡 완전 정복

  // 집중
  '5':  'focus.mp3',     // 집중력 향상 마음챙김
  '19': 'focus2.mp3',    // 업무 시작 전 마음 정비
  '20': 'focus.mp3',     // 회의 전 마음 가다듬기
  '21': 'focus2.mp3',    // 공부 집중력 높이기
  '22': 'focus.mp3',     // 창의적 아이디어 열기

  // 불안
  '6':  'anxiety.mp3',   // 불안한 마음 달래기
  '10': 'anxiety2.mp3',  // 투자 불안 다스리기
  '23': 'anxiety.mp3',   // 건강 걱정이 밀려올 때
  '24': 'anxiety2.mp3',  // 대인관계 스트레스 풀기
  '25': 'anxiety.mp3',   // 미래 걱정 내려놓기

  // 자기 사랑
  '7':  'love.mp3',      // 자기 자신을 사랑하는 시간
  '31': 'love2.mp3',     // 내 마음에게 보내는 편지
  '32': 'love.mp3',      // 자기 비판에서 벗어나기
  '33': 'love2.mp3',     // 내 몸과 화해하기

  // 스트레스 (퇴근 후)
  '9':  'stress2.mp3',   // 퇴근 후 하루 마무리
};

// 세션 ID별 사운드 프로필 오버라이드 (카테고리 기본값 대신 사용)
export const SESSION_SOUND_PROFILE_OVERRIDES: Record<string, SoundProfile> = {
  '29': { label: '가이드 명상', emoji: '🌅', description: '감사일기로 하루 시작해요.' },
};

// 카테고리 기본 파일 (세션 ID 매핑 없을 경우 fallback)
const CATEGORY_DEFAULT_SOUND: Record<SessionCategory, string> = {
  stress:  'stress.mp3',
  sleep:   'sleep.mp3',
  focus:   'focus.mp3',
  anxiety: 'anxiety.mp3',
  breath:  'breath.mp3',
  morning: 'morning.mp3',
  love:    'love.mp3',
};

// ── 내부 상태 ─────────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let fadingAudio: HTMLAudioElement | null = null;  // 페이드아웃 중인 오디오
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function clearFade() {
  if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
  // 페이드아웃 도중 중단 시 즉시 정지
  if (fadingAudio) {
    fadingAudio.pause();
    fadingAudio.src = '';
    fadingAudio = null;
  }
}

// ── 공개 API ─────────────────────────────────────────────────────────────

export async function startSessionSound(category: SessionCategory, vol = 0.4, sessionId?: string) {
  stopSessionSound(false);

  // 세션 ID 매핑 → 없으면 카테고리 기본값
  const file = (sessionId && SESSION_SOUND_MAP[sessionId])
    ?? CATEGORY_DEFAULT_SOUND[category];

  const audio = new Audio(`${import.meta.env.BASE_URL}sounds/${file}`);
  audio.loop = true;
  audio.volume = 0;
  currentAudio = audio;

  await audio.play().catch(() => {
    // 브라우저 autoplay 정책으로 실패 시 무시
  });

  // 4초 페이드인
  clearFade();
  const target = vol;
  const step = target / 80; // 4000ms / 50ms = 80 steps
  fadeInterval = setInterval(() => {
    if (!currentAudio) { clearFade(); return; }
    const next = Math.min(currentAudio.volume + step, target);
    currentAudio.volume = next;
    if (next >= target) clearFade();
  }, 50);
}

export function stopSessionSound(fadeOut = true) {
  clearFade();
  if (!currentAudio) return;

  if (fadeOut) {
    const audio = currentAudio;
    fadingAudio = audio;
    currentAudio = null;
    const step = audio.volume / 40; // 2000ms / 50ms = 40 steps
    fadeInterval = setInterval(() => {
      const next = Math.max(audio.volume - step, 0);
      audio.volume = next;
      if (next <= 0) {
        clearInterval(fadeInterval!);
        fadeInterval = null;
        audio.pause();
        audio.src = '';
        fadingAudio = null;
      }
    }, 50);
  } else {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

export function setMasterVolume(vol: number) {
  if (!currentAudio) return;
  clearFade();
  currentAudio.volume = Math.max(0, Math.min(1, vol));
}

/** 완료 벨 — Web Audio API 사인파 (파일 불필요) */
export async function playBell(freq = 432, dur = 3.5) {
  try {
    const c = new AudioContext();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.25, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.start(c.currentTime); osc.stop(c.currentTime + dur);
    setTimeout(() => c.close(), (dur + 0.5) * 1000);
  } catch {}
}

export async function playCompletionBell() {
  await playBell(528, 3.5);
  setTimeout(() => playBell(396, 4.5), 1600);
}

export async function playBreathTick() {
  try {
    const c = new AudioContext();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = 'sine'; osc.frequency.value = 660;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.3);
    setTimeout(() => c.close(), 500);
  } catch {}
}

export function disposeAudio() {
  stopSessionSound(false);
}
