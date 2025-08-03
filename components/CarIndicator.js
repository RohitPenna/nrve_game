import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const CarIndicator = ({ isBoostActive, boostLevel }) => {
  const trailAnim = React.useRef(new Animated.Value(0)).current;
  const boostAnim = React.useRef(new Animated.Value(0)).current;

  // Animate boost trail effect
  React.useEffect(() => {
    if (isBoostActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(trailAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(trailAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      trailAnim.setValue(0);
    }
  }, [isBoostActive, trailAnim]);

  // Animate boost glow
  React.useEffect(() => {
    if (isBoostActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(boostAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(boostAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      boostAnim.setValue(0);
    }
  }, [isBoostActive, boostAnim]);

  const getCarColor = () => {
    if (boostLevel === 2) return '#FF6B6B';
    if (boostLevel === 1) return '#FFD700';
    return '#4CAF50';
  };

  const getTrailColor = () => {
    if (boostLevel === 2) return '#FF0000';
    if (boostLevel === 1) return '#FFA500';
    return '#4CAF50';
  };

  return (
    <View style={styles.container}>
      {/* Boost Trail Effect */}
      {isBoostActive && (
        <Animated.View 
          style={[
            styles.trail,
            {
              backgroundColor: getTrailColor(),
              opacity: trailAnim,
            }
          ]}
        />
      )}

      {/* Car Body */}
      <Svg width={60} height={40}>
        <Defs>
          <LinearGradient id="carGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={getCarColor()} />
            <Stop offset="100%" stopColor={getCarColor()} stopOpacity={0.8} />
          </LinearGradient>
        </Defs>
        
        {/* Car body */}
        <Rect x={5} y={10} width={50} height={20} fill="url(#carGradient)" rx={5} />
        
        {/* Car windows */}
        <Rect x={15} y={12} width={8} height={6} fill="#87CEEB" rx={2} />
        <Rect x={37} y={12} width={8} height={6} fill="#87CEEB" rx={2} />
        
        {/* Wheels */}
        <Circle cx={15} cy={30} r={6} fill="#333" />
        <Circle cx={45} cy={30} r={6} fill="#333" />
        <Circle cx={15} cy={30} r={3} fill="#666" />
        <Circle cx={45} cy={30} r={3} fill="#666" />
        
        {/* Headlights */}
        <Circle cx={8} cy={15} r={2} fill="#FFFF00" />
        <Circle cx={52} cy={15} r={2} fill="#FFFF00" />
      </Svg>

      {/* Boost Glow Effect */}
      {isBoostActive && (
        <Animated.View 
          style={[
            styles.boostGlow,
            {
              backgroundColor: getCarColor(),
              opacity: boostAnim,
            }
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    width: 60,
    height: 40,
    zIndex: 20,
  },
  trail: {
    position: 'absolute',
    left: -20,
    top: 15,
    width: 20,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  boostGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
});

export default CarIndicator; 