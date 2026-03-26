import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

const CHUNK_SECONDS = 3;
const SILENCE_THRESHOLD = 18;
const LOOP_GAP_MS = 450;

type DummyResult = {
  transcript: string;
  keyword_hit: boolean;
  emotion_result: {
    emotion: string;
    confidence: number;
    is_distress: boolean;
    sos_trigger: boolean;
    all_probs: Record<string, number>;
  };
  sos_trigger: boolean;
};

type PreparedSample = {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeKb: number;
  level: number;
  durationSeconds: number;
  createdAt: string;
  localUrl: string;
  queueStatus: "pending";
  payloadShape: {
    endpoint: "/screen_audio";
    method: "POST";
    fieldName: "audio";
    filename: string;
    mimeType: string;
  };
  dummyResult: DummyResult;
};

const DUMMY_RESULTS: DummyResult[] = [
  {
    transcript: "Background speech detected. No danger phrase identified.",
    keyword_hit: false,
    emotion_result: {
      emotion: "neutral",
      confidence: 71,
      is_distress: false,
      sos_trigger: false,
      all_probs: {
        neutral: 71,
        sad: 11,
        fear: 6,
        angry: 5,
        happy: 4,
        disgust: 2,
        surprise: 1,
      },
    },
    sos_trigger: false,
  },
  {
    transcript: "Possible alert phrase heard. Review suggested.",
    keyword_hit: true,
    emotion_result: {
      emotion: "fear",
      confidence: 83,
      is_distress: true,
      sos_trigger: true,
      all_probs: {
        fear: 83,
        sad: 7,
        angry: 4,
        neutral: 3,
        disgust: 2,
        surprise: 1,
        happy: 0,
      },
    },
    sos_trigger: true,
  },
  {
    transcript: "Speech captured. Tone appears uncertain but not urgent.",
    keyword_hit: true,
    emotion_result: {
      emotion: "sad",
      confidence: 62,
      is_distress: true,
      sos_trigger: false,
      all_probs: {
        sad: 62,
        neutral: 17,
        fear: 8,
        angry: 5,
        disgust: 4,
        surprise: 3,
        happy: 1,
      },
    },
    sos_trigger: false,
  },
];

export default function MonitorScreen() {
  const background = useThemeColor({}, "background");
  const light = useThemeColor({}, "light");
  const text = useThemeColor({}, "text");
  const primary = useThemeColor({}, "primary");
  const secondary = useThemeColor({}, "secondary");
  const accent = useThemeColor({}, "accent");

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [statusText, setStatusText] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [samples, setSamples] = useState<PreparedSample[]>([]);
  const [latestSampleId, setLatestSampleId] = useState<string | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  const streamRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkPartsRef = useRef<Blob[]>([]);
  const maxLevelRef = useRef(0);
  const monitoringRef = useRef(false);
  const chunkCounterRef = useRef(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const samplesRef = useRef<PreparedSample[]>([]);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  useEffect(() => {
    return () => {
      void cleanupMonitoring();
      stopPlayback();
      samplesRef.current.forEach((sample) => URL.revokeObjectURL(sample.localUrl));
    };
  }, []);

  const latestSample = useMemo(
    () => samples.find((sample) => sample.id === latestSampleId) ?? null,
    [latestSampleId, samples]
  );

  const latestEmotionBars = useMemo(
    () =>
      Object.entries(latestSample?.dummyResult.emotion_result.all_probs ?? {}).sort(
        (left, right) => right[1] - left[1]
      ),
    [latestSample]
  );

  async function beginMonitoring() {
    if (Platform.OS !== "web") {
      setError(
        "This recording preview is set up for web first. We can add native recording next."
      );
      return;
    }

    try {
      setError(null);
      setStatusText("Requesting microphone access...");

      const mediaDevices = (globalThis as any).navigator?.mediaDevices;
      const MediaRecorderClass = (globalThis as any).MediaRecorder;
      const AudioContextClass =
        (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;

      if (!mediaDevices?.getUserMedia || !MediaRecorderClass || !AudioContextClass) {
        throw new Error("This browser does not support microphone recording.");
      }

      const stream = await mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      monitoringRef.current = true;
      setIsMonitoring(true);
      setStatusText(`Monitoring in ${CHUNK_SECONDS}s chunks...`);

      startChunkLoop();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to start monitoring."
      );
      setStatusText("Idle");
      await cleanupMonitoring();
    }
  }

  function sampleLevelLoop() {
    const analyser = analyserRef.current;
    if (!analyser || !monitoringRef.current) {
      return;
    }

    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);

    const average =
      values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    maxLevelRef.current = Math.max(maxLevelRef.current, average);
    rafRef.current = requestAnimationFrame(sampleLevelLoop);
  }

  function startChunkLoop() {
    if (!monitoringRef.current || !streamRef.current) {
      return;
    }

    const MediaRecorderClass = (globalThis as any).MediaRecorder;
    const mimeType = MediaRecorderClass.isTypeSupported?.("audio/webm")
      ? "audio/webm"
      : "";

    chunkCounterRef.current += 1;
    chunkPartsRef.current = [];
    maxLevelRef.current = 0;

    const recorder = mimeType
      ? new MediaRecorderClass(streamRef.current, { mimeType })
      : new MediaRecorderClass(streamRef.current);

    recorderRef.current = recorder;
    recorder.ondataavailable = (event: any) => {
      if (event.data?.size > 0) {
        chunkPartsRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      void processChunk(recorder.mimeType || mimeType || "audio/webm");
    };

    recorder.start();
    setStatusText(`Recording chunk ${chunkCounterRef.current}...`);
    sampleLevelLoop();

    timeoutRef.current = setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, CHUNK_SECONDS * 1000);
  }

  async function processChunk(mimeType: string) {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const blob = new Blob(chunkPartsRef.current, { type: mimeType });
    chunkPartsRef.current = [];

    if (!monitoringRef.current) {
      return;
    }

    if (blob.size === 0) {
      setStatusText("Empty chunk skipped.");
      scheduleNextChunk();
      return;
    }

    if (maxLevelRef.current < SILENCE_THRESHOLD) {
      setStatusText("Silence detected. Chunk skipped.");
      scheduleNextChunk();
      return;
    }

    setIsPreparing(true);
    setStatusText("Preparing sample for later upload...");

    const sample = createPreparedSample(blob, mimeType, maxLevelRef.current);
    setSamples((current) => [sample, ...current].slice(0, 12));
    setLatestSampleId(sample.id);
    setIsPreparing(false);
    setError(null);
    setStatusText("Sample captured locally and added to the pending queue.");

    scheduleNextChunk();
  }

  function scheduleNextChunk() {
    if (!monitoringRef.current) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      startChunkLoop();
    }, LOOP_GAP_MS);
  }

  function createPreparedSample(
    blob: Blob,
    mimeType: string,
    level: number
  ): PreparedSample {
    const extension = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mp4")
        ? "mp4"
        : "webm";
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filename = `monitor-${id}.${extension}`;
    const dummyResult = DUMMY_RESULTS[chunkCounterRef.current % DUMMY_RESULTS.length];

    return {
      id,
      blob,
      filename,
      mimeType,
      sizeKb: Number((blob.size / 1024).toFixed(1)),
      level: Number(level.toFixed(1)),
      durationSeconds: CHUNK_SECONDS,
      createdAt: new Date().toLocaleTimeString(),
      localUrl: URL.createObjectURL(blob),
      queueStatus: "pending",
      payloadShape: {
        endpoint: "/screen_audio",
        method: "POST",
        fieldName: "audio",
        filename,
        mimeType,
      },
      dummyResult,
    };
  }

  async function cleanupMonitoring() {
    monitoringRef.current = false;
    setIsMonitoring(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // Ignore cleanup close failures.
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsPreparing(false);
    setStatusText("Idle");
  }

  function playSample(sample: PreparedSample) {
    if (Platform.OS !== "web") {
      return;
    }

    stopPlayback();

    const player = new Audio(sample.localUrl);
    audioPlayerRef.current = player;
    setPlayingSampleId(sample.id);
    player.onended = () => setPlayingSampleId(null);
    player.onerror = () => {
      setError("Unable to play this captured sample in the browser.");
      setPlayingSampleId(null);
    };
    void player.play().catch(() => {
      setError("Unable to play this captured sample in the browser.");
      setPlayingSampleId(null);
    });
  }

  function stopPlayback() {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    setPlayingSampleId(null);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={[styles.heroCard, { backgroundColor: light }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopyBlock}>
            <ThemedText style={[styles.heroEyebrow, { color: secondary }]}>
              Monitor
            </ThemedText>
            <ThemedText type="title">Record, queue, and preview.</ThemedText>
            <ThemedText style={styles.heroCopy}>
              This polished client-only monitor captures real samples, skips silence,
              stores the exact payload shape your backend will need later, and lets you
              hear every queued clip from the UI.
            </ThemedText>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: primary }]}>
            <Ionicons name="pulse" size={18} color="#fff" />
            <ThemedText style={styles.heroBadgeText}>Client-only mode</ThemedText>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetricCard label="Chunk Size" value={`${CHUNK_SECONDS}s`} />
          <MetricCard label="Queue" value={`${samples.length}`} />
          <MetricCard label="Silence Gate" value={`>${SILENCE_THRESHOLD}`} />
          <MetricCard label="Upload Shape" value="audio file" />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: primary }]}
            onPress={isMonitoring ? cleanupMonitoring : beginMonitoring}
          >
            <Ionicons
              name={isMonitoring ? "stop-circle" : "mic"}
              size={18}
              color="#fff"
            />
            <ThemedText style={styles.primaryButtonText}>
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: accent }]}
            onPress={stopPlayback}
            disabled={!playingSampleId}
          >
            <ThemedText style={{ color: playingSampleId ? text : "#A28B95" }}>
              Stop Audio
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.statusPanel}>
          <View style={styles.statusRow}>
            <ThemedText style={styles.statusLabel}>State</ThemedText>
            <ThemedText style={styles.statusValue}>{statusText}</ThemedText>
          </View>
          <View style={styles.statusRow}>
            <ThemedText style={styles.statusLabel}>Later request</ThemedText>
            <ThemedText style={styles.statusValue}>
              `POST /screen_audio` with `FormData(audio=file)`
            </ThemedText>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={16} color="#9C5600" />
            <ThemedText style={{ color: "#9C5600", flex: 1 }}>{error}</ThemedText>
          </View>
        ) : null}
      </ThemedView>

      <ThemedView style={[styles.sectionCard, { backgroundColor: light }]}>
        <SectionHeader
          eyebrow="Latest Preview"
          title={latestSample ? latestSample.filename : "No sample yet"}
          accent={secondary}
        />

        {!latestSample ? (
          <ThemedText>
            Start monitoring and the first non-silent chunk will appear here.
          </ThemedText>
        ) : (
          <>
            <View style={styles.sampleSummary}>
              <Chip label={`${latestSample.sizeKb} KB`} />
              <Chip label={`level ${latestSample.level}`} />
              <Chip label={`${latestSample.durationSeconds}s`} />
              <Chip
                label={latestSample.dummyResult.sos_trigger ? "alert-style" : "safe-style"}
              />
            </View>

            <View style={styles.payloadCard}>
              <ThemedText type="defaultSemiBold">Prepared payload</ThemedText>
              <ThemedText style={styles.payloadLine}>
                endpoint: {latestSample.payloadShape.endpoint}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                method: {latestSample.payloadShape.method}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                field: {latestSample.payloadShape.fieldName}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                filename: {latestSample.payloadShape.filename}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                type: {latestSample.payloadShape.mimeType}
              </ThemedText>
            </View>

            <View style={styles.payloadCard}>
              <ThemedText type="defaultSemiBold">Dummy response preview</ThemedText>
              <ThemedText style={styles.payloadLine}>
                transcript: {latestSample.dummyResult.transcript}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                keyword hit: {latestSample.dummyResult.keyword_hit ? "true" : "false"}
              </ThemedText>
              <ThemedText style={styles.payloadLine}>
                emotion:{" "}
                {latestSample.dummyResult.emotion_result.emotion.toUpperCase()} (
                {latestSample.dummyResult.emotion_result.confidence}%)
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: secondary }]}
              onPress={() => playSample(latestSample)}
            >
              {playingSampleId === latestSample.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#fff" />
                  <ThemedText style={styles.primaryButtonText}>Play Latest Sample</ThemedText>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.probabilityList}>
              {latestEmotionBars.map(([label, value]) => {
                const highlight =
                  label === latestSample.dummyResult.emotion_result.emotion;
                return (
                  <View key={label} style={styles.probabilityRow}>
                    <ThemedText
                      style={[
                        styles.probabilityLabel,
                        highlight ? { color: primary } : null,
                      ]}
                    >
                      {label}
                    </ThemedText>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${value}%`,
                            backgroundColor: highlight ? primary : secondary,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.probabilityValue}>{value}%</ThemedText>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ThemedView>

      <ThemedView style={[styles.sectionCard, { backgroundColor: light }]}>
        <SectionHeader
          eyebrow="Pending Samples"
          title="What would be sent later"
          accent={secondary}
        />
        <ThemedText style={styles.queueCopy}>
          Every non-silent sample below is already packaged the way your later backend
          integration will need it. Right now they stay queued on the client only.
        </ThemedText>

        {samples.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Ionicons name="cloud-upload-outline" size={22} color={secondary} />
            <ThemedText>No pending samples yet.</ThemedText>
          </View>
        ) : (
          samples.map((sample) => (
            <View key={sample.id} style={styles.queueCard}>
              <View style={styles.queueTop}>
                <View>
                  <ThemedText type="defaultSemiBold">{sample.filename}</ThemedText>
                  <ThemedText style={styles.queueMeta}>
                    {sample.createdAt} • {sample.sizeKb} KB • level {sample.level}
                  </ThemedText>
                </View>
                <View style={styles.pendingBadge}>
                  <ThemedText style={styles.pendingBadgeText}>Pending</ThemedText>
                </View>
              </View>

              <View style={styles.queueInfoRow}>
                <Chip label={sample.payloadShape.endpoint} />
                <Chip label={sample.payloadShape.fieldName} />
                <Chip label={sample.mimeType} />
              </View>

              <TouchableOpacity
                style={[styles.inlineButton, { borderColor: accent }]}
                onPress={() => playSample(sample)}
              >
                <Ionicons name="headset" size={15} color={accent} />
                <ThemedText style={{ color: accent }}>
                  {playingSampleId === sample.id ? "Playing..." : "Hear sample"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function SectionHeader({
  eyebrow,
  title,
  accent,
}: {
  eyebrow: string;
  title: string;
  accent: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.heroEyebrow, { color: accent }]}>{eyebrow}</ThemedText>
      <ThemedText type="subtitle">{title}</ThemedText>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    marginTop: 24,
    borderRadius: 30,
    padding: 22,
    gap: 16,
    borderWidth: 1,
    borderColor: "#F4D8E1",
    shadowColor: "#D94F70",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  heroTop: {
    gap: 14,
  },
  heroCopyBlock: {
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroCopy: {
    lineHeight: 24,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBadgeText: {
    color: "#fff",
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: 116,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF7FA",
    borderWidth: 1,
    borderColor: "#F4D8E1",
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: Fonts.mono,
    color: "#8A6773",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  primaryButton: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FFF9FB",
    borderWidth: 1,
    borderColor: "#F4D8E1",
    gap: 10,
  },
  statusRow: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: Fonts.mono,
    color: "#8A6773",
  },
  statusValue: {
    fontSize: 14,
    lineHeight: 22,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#F0C48A",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFF4E8",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionCard: {
    borderRadius: 26,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  sectionHeader: {
    gap: 6,
  },
  sampleSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF7FA",
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  payloadCard: {
    borderRadius: 20,
    padding: 14,
    gap: 6,
    backgroundColor: "#FFF9FB",
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  payloadLine: {
    fontSize: 14,
    lineHeight: 22,
  },
  playButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  probabilityList: {
    gap: 10,
  },
  probabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  probabilityLabel: {
    width: 72,
    fontSize: 12,
    textTransform: "uppercase",
    fontFamily: Fonts.mono,
  },
  probabilityValue: {
    width: 48,
    textAlign: "right",
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(126, 92, 173, 0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  queueCopy: {
    lineHeight: 24,
  },
  emptyQueue: {
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F4D8E1",
    backgroundColor: "#FFF9FB",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  queueCard: {
    borderRadius: 20,
    padding: 14,
    gap: 12,
    backgroundColor: "#FFF9FB",
    borderWidth: 1,
    borderColor: "#F4D8E1",
  },
  queueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  queueMeta: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.75,
  },
  pendingBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(217, 79, 112, 0.1)",
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: "#A83A5D",
  },
  queueInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
