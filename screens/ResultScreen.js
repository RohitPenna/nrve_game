import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { score } = route.params || {
    rhyme_accuracy_score: 0,
    beat_sync_accuracy: 0,
    creativity_score: 0,
    bestCombo: 0,
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good job!';
    return 'Keep practicing!';
  };

  const getBeatSyncMessage = (accuracy) => {
    if (accuracy >= 80) return 'Perfect timing!';
    if (accuracy >= 60) return 'Good rhythm!';
    return 'Work on timing!';
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Game Results</Text>
          <Text style={styles.subtitle}>Your Rhyme Racer Performance</Text>
        </View>

        <View style={styles.scoreGrid}>
          {/* Rhyme Accuracy Score */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>Rhyme Accuracy</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(score.rhyme_accuracy_score) }]}>
                {score.rhyme_accuracy_score}%
              </Text>
            </View>
            <Text style={styles.scoreMessage}>
              {getScoreMessage(score.rhyme_accuracy_score)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${score.rhyme_accuracy_score}%`,
                    backgroundColor: getScoreColor(score.rhyme_accuracy_score)
                  }
                ]} 
              />
            </View>
          </View>

          {/* Beat Sync Accuracy */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>Beat Sync</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(score.beat_sync_accuracy) }]}>
                {score.beat_sync_accuracy}%
              </Text>
            </View>
            <Text style={styles.scoreMessage}>
              {getBeatSyncMessage(score.beat_sync_accuracy)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${score.beat_sync_accuracy}%`,
                    backgroundColor: getScoreColor(score.beat_sync_accuracy)
                  }
                ]} 
              />
            </View>
          </View>




        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Performance Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Overall Score</Text>
              <Text style={styles.summaryValue}>
                {Math.round((score.rhyme_accuracy_score + score.beat_sync_accuracy + score.creativity_score) / 3)}%
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Best Combo</Text>
              <Text style={styles.summaryValue}>
                {score.bestCombo}x
              </Text>
            </View>
          </View>

          {/* Creativity Score */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreLabel}>Creativity</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(score.creativity_score) }]}>
                {score.creativity_score}%
              </Text>
            </View>
            <Text style={styles.scoreMessage}>
              {getScoreMessage(score.creativity_score)}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${score.creativity_score}%`,
                    backgroundColor: getScoreColor(score.creativity_score)
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={() => navigation.navigate('Game')}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#cccccc',
  },
  scoreGrid: {
    gap: 20,
  },
  scoreCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreMessage: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#444444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryStats: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  playAgainButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 