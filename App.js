import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';

import StartScreen from './screens/StartScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Start"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Start" component={StartScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Register the app component
registerRootComponent(App);

export default App; 