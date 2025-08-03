import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const AnswerTile = ({ 
  choice, 
  onPress, 
  comboCount, 
  isBoostActive 
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  // Animate on press
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };

  // Animate glow effect based on combo
  React.useEffect(() => {
    if (comboCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [comboCount, glowAnim]);

  const getTileStyle = () => {
    const baseStyle = [
      styles.tile,
      choice.isCorrect ? styles.correctTile : styles.incorrectTile,
    ];

    // Add combo effects
    if (comboCount >= 5) {
      baseStyle.push(styles.comboTile);
    }
    
    if (isBoostActive) {
      baseStyle.push(styles.boostTile);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    if (comboCount >= 5) {
      baseStyle.push(styles.comboText);
    }
    
    if (isBoostActive) {
      baseStyle.push(styles.boostText);
    }

    return baseStyle;
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          shadowOpacity: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.25, 0.8],
          }),
          shadowRadius: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [3.84, 15],
          }),
        },
      ]}
    >
      <TouchableOpacity
        style={getTileStyle()}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={getTextStyle()}>
          {choice.word}
        </Text>
        {comboCount >= 5 && (
          <View style={styles.comboIndicator}>
            <Text style={styles.comboCount}>{comboCount}x</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  tile: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  correctTile: {
    backgroundColor: '#4CAF50',
  },
  incorrectTile: {
    backgroundColor: '#FF9800',
  },
  comboTile: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  boostTile: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF0000',
    shadowColor: '#FF6B6B',
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comboText: {
    color: '#000',
    fontWeight: 'bold',
  },
  boostText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  comboIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  comboCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AnswerTile; 