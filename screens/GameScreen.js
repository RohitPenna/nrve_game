import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

import AnswerTile from '../components/AnswerTile';
import CarIndicator from '../components/CarIndicator';
import { lyricsData } from '../data/lyricsData';

const { width, height } = Dimensions.get('window');
const BEAT_INTERVAL = 1200; // 50 BPM
const GAME_DURATION = 90000; // 90 seconds
const COMBO_BOOST_5 = 5;
const COMBO_BOOST_10 = 10;
const GREEN_ZONE_TOLERANCE = 5; // pixels tolerance for detection

export default function GameScreen() {
  const navigation = useNavigation();

  // State
  const [gameState, setGameState] = useState('waiting');
  const [currentLyric, setCurrentLyric] = useState(null);
  const [answerChoices, setAnswerChoices] = useState([]);
  const [comboCount, setComboCount] = useState(0);
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [boostLevel, setBoostLevel] = useState(0);
  const [timingFeedback, setTimingFeedback] = useState(null);
  const [aiCars, setAiCars] = useState([]);
  const [greenZones, setGreenZones] = useState([]); // multiple zones
  const [score, setScore] = useState({
    totalCorrect: 0,
    totalAttempts: 0,
    perfectHits: 0,
    bestCombo: 0,
    rhymeAttempts: 0,
    rhymeCorrect: 0,
    creativityAttempts: 0,
    creativityCorrect: 0,
  });

  // Refs
  const soundRef = useRef(null);
  const beatTimerRef = useRef(null);
  const gameTimerRef = useRef(null);
  const startTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const lyricIndexRef = useRef(0);
  const carPositionRef = useRef(50); // starting x
  const comboCountRef = useRef(0);
  const scoreRef = useRef(score);

  // Animated values
  const carX = useRef(new Animated.Value(50)).current;
  const comboScale = useRef(new Animated.Value(1)).current;
  const boostGlow = useRef(new Animated.Value(0)).current;
  const answerChoicesScale = useRef(new Animated.Value(0)).current;
  const beatRipple = useRef(new Animated.Value(0)).current;

  // Sync car animated value into ref
  useEffect(() => {
    const carListener = carX.addListener(({ value }) => {
      carPositionRef.current = value;
    });
    return () => {
      carX.removeListener(carListener);
    };
  }, [carX]);

  // Initialize audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/beat.mp3'),
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      } catch (err) {
        console.log('Audio fallback:', err);
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT' },
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
      }
    };
    initAudio();
    return () => {
      if (soundRef.current) soundRef.current.stopAsync();
    };
  }, []);

  // AI car update
  const updateAiCars = useCallback(() => {
    setAiCars(prev =>
      prev.map(car => ({
        ...car,
        position: Math.min(car.position + car.speed, width - 60),
      }))
    );
  }, []);

  // Create and animate a new green zone (with its own listener to track currentX)
  const createGreenZone = useCallback(() => {
    const zoneWidth = 120;
    const id = `green-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const translateX = new Animated.Value(width + 50);
    const pulse = new Animated.Value(0);
    // currentX will be kept in object
    const zone = {
      id,
      width: zoneWidth,
      startTime: Date.now(),
      translateX,
      pulse,
      currentX: width + 50,
      listenerId: null,
    };

    // Listener to keep currentX updated for accurate hit detection
    const listenerId = translateX.addListener(({ value }) => {
      zone.currentX = value;
    });
    zone.listenerId = listenerId;

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide animation
    Animated.timing(translateX, {
      toValue: -zoneWidth,
      duration: 5000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        // cleanup listener before removing zone
        translateX.removeListener(listenerId);
        setGreenZones(zones => zones.filter(z => z.id !== id));
      }
    });

    setGreenZones(zones => [...zones, zone]);
  }, []);

  // Boost effect
  const triggerBoost = useCallback((level) => {
    setBoostLevel(level);
    setIsBoostActive(true);

    Animated.sequence([
      Animated.timing(boostGlow, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(boostGlow, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.spring(comboScale, {
        toValue: 1.3,
        damping: 10,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.spring(comboScale, {
        toValue: 1,
        damping: 10,
        stiffness: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setIsBoostActive(false);
    }, 3000);
  }, []);

  // Show lyric and answer choices
  const showNewLyric = useCallback(() => {
    if (lyricsData && lyricsData.length > 0) {
      // Randomly select a lyric
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
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Check if car is in any active green zone
  const isCarInAnyGreenZone = useCallback(() => {
    const carCenter = carPositionRef.current + 25; // assume car width ~50
    for (const zone of greenZones) {
      const left = zone.currentX - GREEN_ZONE_TOLERANCE;
      const right = zone.currentX + zone.width + GREEN_ZONE_TOLERANCE;
      if (carCenter >= left && carCenter <= right) {
        return true;
      }
    }
    return false;
  }, [greenZones]);

  // Handle answer tap
  const handleAnswerTap = useCallback(
    (choice) => {
      const now = Date.now();
      const isCorrect = choice.isCorrect;

      const beatTime = startTimeRef.current + currentBeatRef.current * BEAT_INTERVAL;
      const beatOffset = Math.abs(now - beatTime);
      const reactionTime = choice.startTime ? now - choice.startTime : 0;

      const carInGreenZone = isCarInAnyGreenZone();

      let feedback = 'miss';
      if (isCorrect && carInGreenZone) {
        feedback = 'perfect';
      } else if (isCorrect) {
        feedback = 'good';
      }

      setTimingFeedback(feedback);
      setTimeout(() => setTimingFeedback(null), 1000);

      if (isCorrect && carInGreenZone) {
        const newCombo = comboCountRef.current + 1;
        comboCountRef.current = newCombo;
        setComboCount(newCombo);

        const moveDistance = isBoostActive ? 30 : 20;
        const targetPos = Math.min(carPositionRef.current + moveDistance, width - 100);
        carPositionRef.current = targetPos;
        Animated.timing(carX, {
          toValue: targetPos,
          duration: 200,
          useNativeDriver: true,
        }).start();

        if (newCombo === COMBO_BOOST_5 && boostLevel === 0) {
          triggerBoost(1);
        } else if (newCombo === COMBO_BOOST_10 && boostLevel === 1) {
          triggerBoost(2);
        }

        // Track rhyme and creativity metrics
        const isRhymeQuestion = currentLyric?.rhyme === 'yes';
        const isCreativityQuestion = currentLyric?.creative === 'yes';
        
        console.log('Lyric Debug:', {
          lyricId: currentLyric?.id,
          rhyme: currentLyric?.rhyme,
          creative: currentLyric?.creative,
          isRhymeQuestion,
          isCreativityQuestion,
          rhymeAttempts: scoreRef.current.rhymeAttempts,
          rhymeCorrect: scoreRef.current.rhymeCorrect,
          creativityAttempts: scoreRef.current.creativityAttempts,
          creativityCorrect: scoreRef.current.creativityCorrect
        });
        
        scoreRef.current = {
          ...scoreRef.current,
          totalCorrect: scoreRef.current.totalCorrect + 1,
          totalAttempts: scoreRef.current.totalAttempts + 1,
          perfectHits: scoreRef.current.perfectHits + 1,
          bestCombo: Math.max(scoreRef.current.bestCombo, newCombo),
          rhymeAttempts: scoreRef.current.rhymeAttempts + (isRhymeQuestion ? 1 : 0),
          rhymeCorrect: scoreRef.current.rhymeCorrect + (isRhymeQuestion ? 1 : 0),
          creativityAttempts: scoreRef.current.creativityAttempts + (isCreativityQuestion ? 1 : 0),
          creativityCorrect: scoreRef.current.creativityCorrect + (isCreativityQuestion ? 1 : 0),
        };
        setScore(scoreRef.current);
      } else if (isCorrect) {
        comboCountRef.current = 0;
        setComboCount(0);
        
        // Track rhyme and creativity metrics for correct but off-zone
        const isRhymeQuestion = currentLyric?.rhyme === 'yes';
        const isCreativityQuestion = currentLyric?.creative === 'yes';
        
        // For "good" answers: count positively for rhyme/creativity, negatively for beat sync
        scoreRef.current = {
          ...scoreRef.current,
          totalAttempts: scoreRef.current.totalAttempts + 1,
          rhymeAttempts: scoreRef.current.rhymeAttempts + (isRhymeQuestion ? 1 : 0),
          rhymeCorrect: scoreRef.current.rhymeCorrect + (isRhymeQuestion ? 1 : 0), // Count as correct for rhyme
          creativityAttempts: scoreRef.current.creativityAttempts + (isCreativityQuestion ? 1 : 0),
          creativityCorrect: scoreRef.current.creativityCorrect + (isCreativityQuestion ? 1 : 0), // Count as correct for creativity
        };
        setScore(scoreRef.current);
      } else {
        comboCountRef.current = 0;
        setComboCount(0);
        setIsBoostActive(false);
        setBoostLevel(0);
        const backPos = Math.max(carPositionRef.current - 15, 0);
        carPositionRef.current = backPos;
        Animated.timing(carX, {
          toValue: backPos,
          duration: 200,
          useNativeDriver: true,
        }).start();
        // Track rhyme and creativity metrics for misses
        const isRhymeQuestion = currentLyric?.rhyme === 'yes';
        const isCreativityQuestion = currentLyric?.creative === 'yes';
        
        scoreRef.current = {
          ...scoreRef.current,
          totalAttempts: scoreRef.current.totalAttempts + 1,
          rhymeAttempts: scoreRef.current.rhymeAttempts + (isRhymeQuestion ? 1 : 0),
          creativityAttempts: scoreRef.current.creativityAttempts + (isCreativityQuestion ? 1 : 0),
        };
        setScore(scoreRef.current);
      }

      Animated.timing(answerChoicesScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      setTimeout(() => setAnswerChoices([]), 200);
    },
    [isCarInAnyGreenZone, isBoostActive, boostLevel, triggerBoost]
  );

  // End game
  const endGame = useCallback(() => {
    if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    if (soundRef.current) soundRef.current.stopAsync();

    const finalScore = {
      ...scoreRef.current,
      rhyme_accuracy_score:
        scoreRef.current.rhymeAttempts > 0
          ? Math.round((scoreRef.current.rhymeCorrect / scoreRef.current.rhymeAttempts) * 100)
          : 0,
      beat_sync_accuracy:
        scoreRef.current.totalAttempts > 0
          ? Math.round((scoreRef.current.perfectHits / scoreRef.current.totalAttempts) * 100)
          : 0,
      creativity_score:
        scoreRef.current.creativityAttempts > 0
          ? Math.round((scoreRef.current.creativityCorrect / scoreRef.current.creativityAttempts) * 100)
          : 0,
    };

    setScore(finalScore);
    setGameState('finished');

    setTimeout(() => {
      navigation.navigate('Result', { score: finalScore });
    }, 1500);
  }, [navigation]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    startTimeRef.current = Date.now();
    currentBeatRef.current = 0;
    lyricIndexRef.current = 0;
    carPositionRef.current = 50;
    comboCountRef.current = 0;
    carX.setValue(50);
    setComboCount(0);
    setIsBoostActive(false);
    setBoostLevel(0);
    scoreRef.current = {
      totalCorrect: 0,
      totalAttempts: 0,
      perfectHits: 0,
      bestCombo: 0,
      rhymeAttempts: 0,
      rhymeCorrect: 0,
      creativityAttempts: 0,
      creativityCorrect: 0,
    };
    setScore(scoreRef.current);
    setGreenZones([]);

    setAiCars([
      { id: 1, position: 50, speed: 0.5 },
      { id: 2, position: 150, speed: 0.3 },
      { id: 3, position: 250, speed: 0.7 },
    ]);

    showNewLyric();
    createGreenZone();

    beatTimerRef.current = setInterval(() => {
      currentBeatRef.current++;

      // Beat ripple
      Animated.sequence([
        Animated.timing(beatRipple, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(beatRipple, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      if (currentBeatRef.current % 4 === 0) {
        showNewLyric();
        createGreenZone();
      }

      updateAiCars();
    }, BEAT_INTERVAL);

    gameTimerRef.current = setTimeout(() => {
      endGame();
    }, GAME_DURATION);
  }, [showNewLyric, createGreenZone, updateAiCars, endGame]);

  useEffect(() => {
    const timer = setTimeout(() => startGame(), 1000);
    return () => clearTimeout(timer);
  }, [startGame]);

  useEffect(() => {
    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
      if (soundRef.current) soundRef.current.stopAsync();
    };
  }, []);

  // Memoized renders
  const memoizedAnswerTiles = useMemo(() => {
    return answerChoices.map(choice => (
      <AnswerTile
        key={choice.id}
        choice={choice}
        onPress={() => handleAnswerTap(choice)}
        comboCount={comboCount}
        isBoostActive={isBoostActive}
      />
    ));
  }, [answerChoices, comboCount, isBoostActive, handleAnswerTap]);

  const memoizedAiCars = useMemo(() => {
    return aiCars.map(car => (
      <View key={`ai-${car.id}`} style={[styles.aiCar, { left: car.position }]}>
        <Svg width={50} height={30}>
          <Rect x={5} y={8} width={40} height={14} fill="#666" rx={3} />
          <Circle cx={12} cy={22} r={4} fill="#444" />
          <Circle cx={38} cy={22} r={4} fill="#444" />
        </Svg>
      </View>
    ));
  }, [aiCars]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gameArea}>
        {/* Background */}
        <View style={styles.skyline}>
          <Svg width={width * 2} height={height * 0.6}>
            <Defs>
              <LinearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#1a1a2e" />
                <Stop offset="50%" stopColor="#16213e" />
                <Stop offset="100%" stopColor="#0f3460" />
              </LinearGradient>
            </Defs>
            <Rect width={width * 2} height={height * 0.6} fill="url(#skyGradient)" />
            {[...Array(16)].map((_, i) => (
              <Rect
                key={`building-${i}`}
                x={i * (width / 8)}
                y={height * 0.3 - Math.random() * 150}
                width={width / 8 - 10}
                height={100 + Math.random() * 200}
                fill={`hsl(${200 + Math.random() * 60}, 70%, ${30 + Math.random() * 20}%)`}
                opacity={0.8}
              />
            ))}
          </Svg>
        </View>

        {/* Road */}
        <View style={styles.road}>
          <View style={styles.roadShoulder} />
          <View style={styles.roadLane}>
            {greenZones.map(zone => (
              <Animated.View
                key={zone.id}
                style={[
                  styles.greenZone,
                  {
                    width: zone.width,
                    transform: [
                      { translateX: zone.translateX },
                      {
                        scale: zone.pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        }),
                      },
                    ],
                    opacity: zone.pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.beatRipple,
                    {
                      opacity: beatRipple.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 0],
                      }),
                      transform: [
                        {
                          scale: beatRipple.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </Animated.View>
            ))}
            <View style={styles.roadLine} />
          </View>
        </View>

        {/* AI Cars */}
        {memoizedAiCars}

        {/* Player Car */}
        <Animated.View
          style={[
            styles.playerCar,
            {
              transform: [
                { translateX: carX },
                {
                  scale: boostGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            },
          ]}
        >
          <CarIndicator isBoostActive={isBoostActive} boostLevel={boostLevel} />
        </Animated.View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            State: {gameState} | Combo: {comboCount} | Beat: {currentBeatRef.current}{' '}
            {currentLyric && `| Lyric: ${currentLyric.prompt}`}
          </Text>
          <Text style={styles.debugText}>
            Car: {carPositionRef.current.toFixed(1)} | ActiveZones: {greenZones.length}
          </Text>
        </View>

        {/* Lyric */}
        <View style={styles.lyricContainer}>
          <Text style={styles.lyricText}>
            {currentLyric ? currentLyric.prompt : 'Get ready to rhyme!'}
          </Text>
        </View>

        {/* Instruction */}
        <View style={styles.greenZoneIndicator}>
          <Text style={styles.greenZoneText}>
            {greenZones.length ? 'TAP WHEN CAR IS IN GREEN ZONE!' : 'Waiting...'}
          </Text>
          <Text style={styles.beatCountText}>Beat {currentBeatRef.current}</Text>
        </View>

        {/* Answer choices */}
        <Animated.View
          style={[
            styles.answerContainer,
            {
              transform: [{ scale: answerChoicesScale }],
              opacity: answerChoicesScale,
            },
          ]}
        >
          {memoizedAnswerTiles}
        </Animated.View>

        {/* Combo / Boost */}
        {comboCount > 0 && (
          <Animated.View style={[styles.comboContainer, { transform: [{ scale: comboScale }] }]}>
            <Text style={styles.comboText}>Combo: {comboCount}x</Text>
            {isBoostActive && (
              <Animated.View
                style={[
                  styles.boostContainer,
                  {
                    opacity: boostGlow,
                    transform: [
                      {
                        scale: boostGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.boostText}>BOOST LEVEL {boostLevel}!</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Timing feedback */}
        {timingFeedback && (
          <View style={styles.timingFeedbackContainer}>
            <Text
              style={[
                styles.timingFeedbackText,
                timingFeedback === 'perfect' && styles.perfectText,
                timingFeedback === 'good' && styles.goodText,
                timingFeedback === 'miss' && styles.missText,
              ]}
            >
              {timingFeedback.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Overlays */}
        {gameState === 'waiting' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Starting...</Text>
          </View>
        )}
        {gameState === 'finished' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Game Over!</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  gameArea: { flex: 1, position: 'relative' },
  skyline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    zIndex: 1,
  },
  road: {
    position: 'absolute',
    bottom: height * 0.2,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 2,
  },
  roadShoulder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#2a2a2a',
  },
  roadLane: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#333',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
  },
  greenZone: {
    position: 'absolute',
    top: 0,
    height: 80,
    backgroundColor: 'rgba(0, 255, 0, 0.6)',
    borderWidth: 3,
    borderColor: '#00ff00',
    borderRadius: 5,
    overflow: 'hidden',
  },
  beatRipple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  roadLine: {
    position: 'absolute',
    top: 35,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  aiCar: {
    position: 'absolute',
    bottom: height * 0.2 + 40,
    zIndex: 3,
  },
  playerCar: {
    position: 'absolute',
    bottom: height * 0.2 + 40,
    zIndex: 4,
  },
  lyricContainer: {
    position: 'absolute',
    top: height * 0.1,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    zIndex: 10,
  },
  lyricText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  greenZoneIndicator: {
    position: 'absolute',
    top: height * 0.3,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,255,0,0.2)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  greenZoneText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  beatCountText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  answerContainer: {
    position: 'absolute',
    bottom: height * 0.5,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  comboContainer: {
    position: 'absolute',
    top: height * 0.15,
    right: 20,
    backgroundColor: 'rgba(255,215,0,0.9)',
    padding: 10,
    borderRadius: 10,
    zIndex: 10,
  },
  comboText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boostContainer: {
    marginTop: 5,
    padding: 5,
    backgroundColor: 'rgba(255,0,0,0.8)',
    borderRadius: 5,
  },
  boostText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  debugContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 25,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
      timingFeedbackContainer: {
      position: 'absolute',
      top: height * 0.5,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 15,
    },
    timingFeedbackText: {
      fontSize: 24,
      fontWeight: 'bold',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
    perfectText: { color: '#00FF00' },
    goodText: { color: '#FFFF00' },
    missText: { color: '#FF0000' },
    overlayText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    },
  });
