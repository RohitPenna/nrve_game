import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function StartScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rhyme Racer</Text>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to Play:</Text>
          
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1.</Text>
            <Text style={styles.instructionText}>
              Watch for green zones appearing on the road
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2.</Text>
            <Text style={styles.instructionText}>
              When your car enters a green zone, tap the answer you think is best.
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3.</Text>
            <Text style={styles.instructionText}>
              Perfect timing = car moves forward faster
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4.</Text>
            <Text style={styles.instructionText}>
              Build combos for speed boosts and higher scores
            </Text>
          </View>
        </View>
        
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips:</Text>
          <Text style={styles.tipText}>• Only tap when your car is in the green zone</Text>
          <Text style={styles.tipText}>• Choose the word that rhymes best</Text>
          <Text style={styles.tipText}>• Stay in rhythm for better scores</Text>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Game')}
        >
          <Text style={styles.startButtonText}>Start Race!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff00',
    marginRight: 10,
    minWidth: 25,
  },
  instructionText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
    lineHeight: 22,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#00ff00',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
}); 