import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  PanResponder,
} from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

import AnswerTile from '../components/AnswerTile';
import { lyricsData } from '../data/lyricsData';

const { width, height } = Dimensions.get('window');

/** === Timing & Game Length === */
const BEAT_INTERVAL = 1200;              // 50 BPM
const GAME_DURATION_MS = 60000;          // 60 seconds round

/** === Speed & Distance Tuning === */
const PX_PER_METER = 2.2;                // visual tuning: pixels ~ meters
const SPEED_MIN = 140;                   // px/sec
const SPEED_MAX = 520;                   // px/sec cap
const SPEED_GOOD_INC = 30;               // correct but not perfect
const SPEED_PERFECT_INC = 80;            // perfect in green zone
const SPEED_MISS_DEC = 70;               // miss penalty
const SPEED_COLLISION_DEC = 120;         // bump penalty
const BOOST_DECAY = 0.96;                // per beat

/** === Green Zones === */
const GREEN_ZONE_WIDTH = 70;
const GREEN_ZONE_SPAWN_EVERY_BEATS = 4;

/** === Visuals === */
const COLORS = {
  bg: '#0c1020',
  text: '#e8ecff',
  subtext: '#b6c0ff',
  neonGreen: '#39ff88',
  neonYellow: '#ffd66a',
  road: '#1a1f3a',
  roadEdge: '#2b335a',
  red: '#ff4d4d',
  neonPink: '#ff6ad5',
};

const LEFT_MARGIN = 16;
const SWEET_SPOT_X = Math.max(LEFT_MARGIN + 120, Math.floor(width * 0.35)); // player's fixed visual x

export default function GameScreen() {
  const navigation = useNavigation();

  // ===== Game state =====
  const [gameState, setGameState] = useState('waiting');

  /** Rhyme Q&A */
  const [currentLyric, setCurrentLyric] = useState(null);
  const [answerChoices, setAnswerChoices] = useState([]);
  const [timingFeedback, setTimingFeedback] = useState(null); // 'perfect' | 'good' | 'miss' | 'bump'

  /** Scoring / HUD */
  const [comboCount, setComboCount] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(GAME_DURATION_MS);

  /** World entities */
  const [traffic, setTraffic] = useState([]); // {id,x,y,speed,color,border}
  const [greenZones, setGreenZones] = useState([]); // {id,x,width,pulse}

  /** Audio & loops */
  const soundRef = useRef(null);
  const beatTimerRef = useRef(null);
  const gameTimerRef = useRef(null);
  const rafRef = useRef(null);

  /** Loop math refs */
  const speedRef = useRef(SPEED_MIN);
  const lastTsRef = useRef(0);
  const distanceRef = useRef(0);
  const currentBeatRef = useRef(0);

  /** Animations */
  const roadOffset = useRef(new Animated.Value(0)).current;
  const beatRipple = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // Player position (fixed X, lane-based Y)
  const carX = useRef(new Animated.Value(SWEET_SPOT_X)).current; // not animated with timing/spring
  const comboScale = useRef(new Animated.Value(1)).current;      // native
  const boostGlow = useRef(new Animated.Value(0)).current;       // native
  const answerChoicesScale = useRef(new Animated.Value(0)).current; // native

  // ===== Lanes =====
  const roadBottom = height * 0.2;
  const laneHeights = [55, 45, 35].map((o) => roadBottom + o); // absolute bottoms
  const [playerLaneIndex, setPlayerLaneIndex] = useState(1);
  const playerY = useRef(new Animated.Value(laneHeights[1])).current; // JS-driven layout animation

  // keep a ref mirror for logic
  const playerLaneIndexRef = useRef(1);
  useEffect(() => {
    playerLaneIndexRef.current = playerLaneIndex;
    // IMPORTANT: keep useNativeDriver:false for layout (bottom) animations
    Animated.spring(playerY, {
      toValue: laneHeights[playerLaneIndex],
      useNativeDriver: false,
      stiffness: 180,
      damping: 20,
      mass: 0.8,
    }).start();
  }, [playerLaneIndex, playerY, laneHeights]);

  // ===== Traffic tracking refs for collision calc =====
  const trafficRef = useRef([]);
  const collidedIdsRef = useRef(new Set());
  const collidedFlagRef = useRef(false);
  const lastCollisionAtRef = useRef(0);

  // ===== Input: swipe up/down to change lane =====
  const changeLane = useCallback((dir) => {
    // dir: -1 up, +1 down
    setPlayerLaneIndex((idx) => {
      const next = Math.max(0, Math.min(laneHeights.length - 1, idx + dir));
      return next;
    });
  }, [laneHeights.length]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 12,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -20) changeLane(-1);
        else if (g.dy > 20) changeLane(1);
      },
    })
  ).current;

  // ===== Audio init =====
  useEffect(() => {
    const initAudio = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/beat.mp3'),
          { shouldPlay: true, isLooping: true, volume: 0.7 }
        );
        soundRef.current = sound;
      } catch (err) {
        console.log('Audio load error (fallback silent):', err);
      }
    };
    initAudio();
    return () => {
      if (soundRef.current) soundRef.current.stopAsync();
    };
  }, []);

  // ===== Background road dash loop (purely visual) =====
  useEffect(() => {
    Animated.loop(
      Animated.timing(roadOffset, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [roadOffset]);

  // ===== Spawners =====
  const spawnTrafficCar = useCallback(() => {
    const laneIndex = Math.floor(Math.random() * laneHeights.length);
    const colorChoices = [
      { body: '#2832a3', border: '#6ea8ff' },
      { body: '#7a2aa0', border: '#ff8bf0' },
      { body: '#12826f', border: '#55ffde' },
      { body: '#803c24', border: '#ffb48a' },
    ];
    const palette = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    const t = {
      id: `t-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      x: width + 80,
      y: laneHeights[laneIndex],
      speed: 180 + Math.random() * 120, // 180-300 px/sec
      color: palette.body,
      border: palette.border,
    };
    setTraffic((arr) => [...arr, t]);
  }, [laneHeights]);

  const spawnGreenZone = useCallback(() => {
    const gz = {
      id: `gz-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      x: width + 40,
      width: GREEN_ZONE_WIDTH,
      pulse: new Animated.Value(0),
    };
    Animated.loop(
      Animated.sequence([
        Animated.timing(gz.pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(gz.pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    setGreenZones((zones) => [...zones, gz]);
  }, []);

  const showNewLyric = useCallback(() => {
    if (lyricsData && lyricsData.length > 0) {
      const randomIndex = Math.floor(Math.random() * lyricsData.length);
      const lyric = lyricsData[randomIndex];
      setCurrentLyric(lyric);

      const choices = lyric.options.map((word, index) => ({
        id: `lyric${randomIndex}-opt${index}-${word}-${Math.floor(Math.random() * 1000)}`,
        word,
        isCorrect: word === lyric.correct,
        index,
        startTime: Date.now(),
      }));

      setAnswerChoices(choices);
      Animated.spring(answerChoicesScale, {
        toValue: 1,
        damping: 16,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [answerChoicesScale]);

  // ===== Core game loop =====
  const step = useCallback((ts) => {
    if (gameState !== 'playing') return;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
    lastTsRef.current = ts;

    const playerSpeed = speedRef.current;
    const playerCenterX = SWEET_SPOT_X + 22; // ~car width/2
    const playerLaneYNow = laneHeights[playerLaneIndexRef.current];

    // Move traffic + detect collisions inside updater
    collidedFlagRef.current = false;
    setTraffic((arr) => {
      const next = [];
      for (const c of arr) {
        const relative = playerSpeed - c.speed; // px/sec
        const nx = c.x - relative * dt;

        // Collision check: same lane and x overlap near the player
        if (Math.abs(c.y - playerLaneYNow) < 1) {
          const overlapLeft = playerCenterX - 30;
          const overlapRight = playerCenterX + 24;
          const carCenter = nx + 17; // ~half of 35
          if (carCenter >= overlapLeft && carCenter <= overlapRight) {
            const now = Date.now();
            if (!collidedIdsRef.current.has(c.id) && now - lastCollisionAtRef.current > 350) {
              collidedIdsRef.current.add(c.id);
              collidedFlagRef.current = true;
              lastCollisionAtRef.current = now;
            }
          }
        }

        if (nx > -120) {
          next.push({ ...c, x: nx });
        } else {
          if (collidedIdsRef.current.has(c.id)) collidedIdsRef.current.delete(c.id);
        }
      }
      trafficRef.current = next;
      return next;
    });

    // Move green zones
    setGreenZones((zones) => {
      const next = [];
      for (const z of zones) {
        const nx = z.x - playerSpeed * dt;
        if (nx > -z.width) next.push({ ...z, x: nx });
      }
      return next;
    });

    // Apply collision penalty (once per frame)
    if (collidedFlagRef.current) {
      speedRef.current = Math.max(SPEED_MIN, speedRef.current - SPEED_COLLISION_DEC);
      setComboCount(0);
      setTimingFeedback('bump');
      feedbackAnim.setValue(0);
      Animated.sequence([
        Animated.timing(feedbackAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(feedbackAnim, { toValue: 0, delay: 280, duration: 180, useNativeDriver: true }),
      ]).start(() => setTimingFeedback(null));
    }

    // Distance + timer
    const dpx = playerSpeed * dt;
    distanceRef.current += dpx / PX_PER_METER;
    setDistanceMeters(distanceRef.current);

    setTimeLeftMs((prev) => {
      const after = Math.max(0, prev - Math.round(dt * 1000));
      if (after === 0) endGame();
      return after;
    });

    rafRef.current = requestAnimationFrame(step);
  }, [gameState, laneHeights, feedbackAnim]);

  // ===== Beat loop =====
  const startBeatLoop = useCallback(() => {
    beatTimerRef.current = setInterval(() => {
      currentBeatRef.current++;

      Animated.sequence([
        Animated.timing(beatRipple, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(beatRipple, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

      if (currentBeatRef.current % GREEN_ZONE_SPAWN_EVERY_BEATS === 0) {
        showNewLyric();
        spawnGreenZone();
        spawnTrafficCar();
        spawnTrafficCar();
      } else {
        if (Math.random() < 0.45) spawnTrafficCar();
      }

      // gentle decay
      speedRef.current = Math.max(SPEED_MIN, speedRef.current * BOOST_DECAY);
    }, BEAT_INTERVAL);
  }, [beatRipple, showNewLyric, spawnGreenZone, spawnTrafficCar]);

  // ===== Green zone check =====
  const isCarInAnyGreenZone = useCallback(() => {
    const carCenter = SWEET_SPOT_X + 22;
    for (const z of greenZones) {
      const left = z.x;
      const right = z.x + z.width;
      if (carCenter >= left && carCenter <= right) return true;
    }
    return false;
  }, [greenZones]);

  const triggerBoostFX = useCallback(() => {
    Animated.sequence([
      Animated.timing(boostGlow, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(boostGlow, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.spring(comboScale, { toValue: 1.22, damping: 10, stiffness: 140, useNativeDriver: true }),
      Animated.spring(comboScale, { toValue: 1, damping: 12, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, [boostGlow, comboScale]);

  // ===== Answer handling -> speed changes =====
  const handleAnswerTap = useCallback((choice) => {
    const isCorrect = !!choice.isCorrect;
    const inZone = isCarInAnyGreenZone();

    let feedback = 'miss';
    if (isCorrect && inZone) feedback = 'perfect';
    else if (isCorrect) feedback = 'good';

    setTimingFeedback(feedback);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(feedbackAnim, { toValue: 0, delay: 450, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setTimingFeedback(null));

    if (feedback === 'perfect') {
      speedRef.current = Math.min(SPEED_MAX, speedRef.current + SPEED_PERFECT_INC);
      triggerBoostFX();
      setComboCount((c) => c + 1);
    } else if (feedback === 'good') {
      speedRef.current = Math.min(SPEED_MAX, speedRef.current + SPEED_GOOD_INC);
      setComboCount((c) => c + 1);
    } else {
      speedRef.current = Math.max(SPEED_MIN, speedRef.current - SPEED_MISS_DEC);
      setComboCount(0);
    }

    Animated.timing(answerChoicesScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setAnswerChoices([]);
    });
  }, [isCarInAnyGreenZone, triggerBoostFX, feedbackAnim, answerChoicesScale]);

  // ===== Start / End =====
  const startGame = useCallback(() => {
    setGameState('playing');
    setTraffic([]);
    setGreenZones([]);
    setDistanceMeters(0);
    setTimeLeftMs(GAME_DURATION_MS);
    distanceRef.current = 0;
    speedRef.current = SPEED_MIN;
    currentBeatRef.current = 0;
    lastTsRef.current = 0;
    setComboCount(0);
    setPlayerLaneIndex(1);
    playerLaneIndexRef.current = 1;
    collidedIdsRef.current.clear();

    // layout value only; don't mix drivers
    carX.setValue(SWEET_SPOT_X);

    showNewLyric();
    spawnGreenZone();
    for (let i = 0; i < 3; i++) spawnTrafficCar();

    startBeatLoop();
    rafRef.current = requestAnimationFrame(step);
    gameTimerRef.current = setTimeout(() => endGame(), GAME_DURATION_MS);
  }, [carX, showNewLyric, spawnGreenZone, spawnTrafficCar, startBeatLoop, step]);

  const endGame = useCallback(() => {
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    if (soundRef.current) soundRef.current.stopAsync();

    setGameState('finished');
    setTimeout(() => {
      navigation.navigate('Result', {
        score: {
          distance_m: Math.round(distanceRef.current),
          best_combo: comboCount,
        },
      });
    }, 800);
  }, [navigation, comboCount]);

  useEffect(() => {
    const t = setTimeout(() => startGame(), 900);
    return () => clearTimeout(t);
  }, [startGame]);

  useEffect(() => {
    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
      if (soundRef.current) soundRef.current.stopAsync();
    };
  }, []);

  // ===== UI computed values =====
  const memoizedAnswerTiles = useMemo(
    () =>
      answerChoices.map((choice) => (
        <AnswerTile
          key={choice.id}
          choice={choice}
          onPress={() => handleAnswerTap(choice)}
          comboCount={comboCount}
          isBoostActive={false}
        />
      )),
    [answerChoices, comboCount, handleAnswerTap]
  );

  const dashTranslate = roadOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40],
  });

  const feedbackScale = feedbackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const feedbackOpacity = feedbackAnim;

  const mm = Math.floor(timeLeftMs / 60000);
  const ss = Math.floor((timeLeftMs % 60000) / 1000);
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gameArea} {...panResponder.panHandlers}>

        {/* HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudText}>Time: {timeStr}</Text>
          <Text style={styles.hudText}>Distance: {Math.floor(distanceMeters)} m</Text>
          <Text style={styles.hudText}>Speed: {Math.round(speedRef.current / PX_PER_METER)} m/s</Text>
        </View>

        {/* Background sky */}
        <View style={styles.skyline}>
          <Svg width={width} height={height * 0.6}>
            <Defs>
              <LinearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0e1240" />
                <Stop offset="60%" stopColor="#0a0f2e" />
                <Stop offset="100%" stopColor="#070b23" />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={height * 0.6} fill="url(#skyGradient)" />
            {[...Array(30)].map((_, i) => (
              <Circle key={i} cx={Math.random() * width} cy={Math.random() * height * 0.5} r={Math.random() * 1.6 + 0.4} fill="#cfe4ff" opacity={0.8} />
            ))}
          </Svg>
        </View>

        {/* Road */}
        <View style={styles.road}>
          <View style={styles.roadShoulder} />
          <View style={styles.roadLane}>
            {/* Center dashes */}
            <Animated.View style={[styles.roadDashesRow, { transform: [{ translateX: dashTranslate }] }]}>
              {Array.from({ length: 30 }).map((_, idx) => (<View key={idx} style={styles.roadDash} />))}
            </Animated.View>

            {/* Green Zones */}
            {greenZones.map((zone) => (
              <View
                key={zone.id}
                style={[styles.greenZone, { width: zone.width, left: zone.x }]}
              >
                <Animated.View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [{
                      scale: zone.pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                    }],
                    opacity: zone.pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                  }}
                />
              </View>
            ))}

            {/* Traffic cars */}
            {traffic.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.aiCarIcon,
                  { bottom: c.y, transform: [{ translateX: c.x }] },
                ]}
              >
                <View style={[styles.aiCarBody, styles.cardShadow, { backgroundColor: c.color, borderColor: c.border }]}>
                  <View style={[styles.aiCarTopPart, { backgroundColor: '#ffffff22' }]} />
                  <View style={[styles.aiCarBottomPart, { backgroundColor: '#00000030' }]} />
                  <View style={styles.aiCarWheel} />
                  <View style={[styles.aiCarWheel, { right: 5 }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Player Car */}
        {/* Parent = layout-only (bottom, translateX). No native animations here. */}
        <Animated.View
          style={[
            styles.carIcon,
            { bottom: playerY, transform: [{ translateX: carX }] },
          ]}
        >
          {/* Child = visual boost scale (native). */}
          <Animated.View
            style={{
              transform: [
                { scale: boostGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
              ],
            }}
          >
            <View style={[styles.carBody, styles.cardShadow]}>
              <View style={styles.carTop} />
              <View style={styles.carBottom} />
              <View style={styles.carWheel} />
              <View style={[styles.carWheel, { right: 5 }]} />
              <View style={styles.neonGlow} />
            </View>

            {comboCount > 0 && (
              <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboScale }] }]}>
                <Text style={styles.comboBadgeText}>{comboCount}x</Text>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Lyric prompt */}
        <View style={styles.lyricContainer}>
          <Text style={styles.lyricText}>
            {currentLyric ? currentLyric.prompt : 'Get ready to rhyme!'}
          </Text>
        </View>

        {/* Instruction panel */}
        <View style={styles.greenZoneIndicator}>
          <Text style={styles.greenZoneText}>
            Tap in the GREEN zone for a BOOST! Swipe up/down to change lanes.
          </Text>
          <Text style={styles.beatCountText}>Beat {currentBeatRef.current}</Text>
        </View>

        {/* Answers */}
        <Animated.View style={[styles.answerContainer, { transform: [{ scale: answerChoicesScale }], opacity: answerChoicesScale }]}>
          {memoizedAnswerTiles}
        </Animated.View>

        {/* Timing / Collision feedback */}
        {timingFeedback && (
          <Animated.View style={[styles.timingFeedbackContainer, { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] }]}>
            <Text
              style={[
                styles.timingFeedbackText,
                timingFeedback === 'perfect' && styles.perfectText,
                timingFeedback === 'good' && styles.goodText,
                timingFeedback === 'miss' && styles.missText,
                timingFeedback === 'bump' && styles.bumpText,
              ]}
            >
              {timingFeedback === 'bump' ? 'BUMP!' : timingFeedback.toUpperCase()}
            </Text>
          </Animated.View>
        )}

        {/* Overlays */}
        {gameState === 'waiting' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Starting…</Text>
          </View>
        )}
        {gameState === 'finished' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Time!</Text>
            <Text style={[styles.overlayText, { marginTop: 8, fontSize: 18 }]}>
              Distance: {Math.round(distanceMeters)} m
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ===================== Styles ===================== */
const cardShadowBase = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  android: { elevation: 12 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gameArea: { flex: 1, position: 'relative' },

  hud: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5,8,18,0.7)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(120,140,255,0.25)',
  },
  hudText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },

  skyline: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.6, zIndex: 1 },

  road: { position: 'absolute', bottom: height * 0.2, left: 0, right: 0, height: 120, zIndex: 2 },
  roadShoulder: { position: 'absolute', top: 0, left: 0, right: 0, height: 20, backgroundColor: COLORS.roadEdge },
  roadLane: {
    position: 'absolute', top: 20, left: 0, right: 0, height: 80,
    backgroundColor: COLORS.road, borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#3b4578', overflow: 'hidden',
  },
  roadDashesRow: { position: 'absolute', top: 39, flexDirection: 'row', alignItems: 'center', width: width * 2 },
  roadDash: { width: 30, height: 2, marginRight: 10, backgroundColor: '#aab3ff', opacity: 0.55, borderRadius: 2 },

  greenZone: {
    position: 'absolute',
    top: 0,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#7bffb5',
    backgroundColor: 'rgba(60,255,190,0.18)',
  },

  aiCarIcon: { position: 'absolute', zIndex: 3 },
  aiCarBody: { width: 35, height: 18, borderRadius: 9, position: 'relative', borderWidth: 1.5 },
  aiCarTopPart: { position: 'absolute', top: -6, left: 6, right: 6, height: 6, borderRadius: 3 },
  aiCarBottomPart: { position: 'absolute', bottom: -1, left: 4, right: 4, height: 3, borderRadius: 2 },
  aiCarWheel: { position: 'absolute', bottom: -5, left: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#0a0aa' },
  // fix wheel border color line broken by wrap
  aiCarWheel: { position: 'absolute', bottom: -5, left: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f' },

  carIcon: { position: 'absolute', zIndex: 5 },
  carBody: { width: 44, height: 22, backgroundColor: COLORS.neonPink, borderRadius: 12, position: 'relative', borderWidth: 2, borderColor: '#ff91e4' },
  carTop: { position: 'absolute', top: -8, left: 8, right: 8, height: 8, backgroundColor: '#ff9deb', borderRadius: 4 },
  carBottom: { position: 'absolute', bottom: -3, left: 6, right: 6, height: 5, backgroundColor: '#cf4fb0', borderRadius: 3 },
  carWheel: { position: 'absolute', bottom: -6, left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f' },
  neonGlow: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 16, backgroundColor: COLORS.neonPink, opacity: 0.18 },

  comboBadge: { position: 'absolute', top: -16, right: -12, backgroundColor: COLORS.neonYellow, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: '#ffbf3e' },
  comboBadgeText: { fontSize: 12, fontWeight: '900', color: '#2c2100', letterSpacing: 0.3 },

  lyricContainer: {
    position: 'absolute', top: height * 0.1, left: 16, right: 16,
    backgroundColor: 'rgba(14, 20, 48, 0.72)', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(130,150,255,0.25)', zIndex: 10, ...cardShadowBase,
  },
  lyricText: { color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },

  greenZoneIndicator: {
    position: 'absolute', top: height * 0.3, left: 16, right: 16,
    backgroundColor: 'rgba(10, 255, 160, 0.12)', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(90,255,200,0.35)', alignItems: 'center', zIndex: 10, ...cardShadowBase,
  },
  greenZoneText: { color: COLORS.neonGreen, fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },
  beatCountText: { color: COLORS.subtext, fontSize: 13, marginTop: 6 },

  answerContainer: { position: 'absolute', bottom: height * 0.5, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-around', zIndex: 10 },

  timingFeedbackContainer: { position: 'absolute', top: height * 0.5, left: 0, right: 0, alignItems: 'center', zIndex: 15 },
  timingFeedbackText: { fontSize: 28, fontWeight: '900', letterSpacing: 1.2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 6 },
  perfectText: { color: COLORS.neonGreen },
  goodText: { color: COLORS.neonYellow },
  missText: { color: '#ff7676' },
  bumpText: { color: COLORS.red },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,4,12,0.86)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  overlayText: { color: COLORS.text, fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },

  cardShadow: { ...cardShadowBase },
});
