import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✈️ SkyScout Pro</Text>
        <Text style={styles.subtitle}>Mobile App</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.instructions}>
          This is the starting point for the SkyScout Pro mobile app.
        </Text>
        <Text style={styles.nextStepsTitle}>Next Steps:</Text>
        <Text style={styles.step}>
          1. Run `npm install` or `yarn install` to get dependencies.
        </Text>
        <Text style={styles.step}>
          2. Connect the app to the backend API (http://localhost:3001).
        </Text>
        <Text style={styles.step}>
          3. Build the search form and results screen.
        </Text>
        <Text style={styles.step}>
          4. Use `react-native-vector-icons` for icons.
        </Text>
        <Text style={styles.step}>
          5. Use `react-navigation` for screen transitions.
        </Text>
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Search Flights (Coming Soon)</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  header: {
    backgroundColor: '#0a2540',
    padding: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#00d4ff',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0a2540',
  },
  step: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  button: {
    backgroundColor: '#ccc',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
