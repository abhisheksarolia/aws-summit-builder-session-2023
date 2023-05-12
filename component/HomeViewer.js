import * as React from 'react';
import { Button, View, Text, StyleSheet } from 'react-native';

export default function HomeViewer() {
  return (
    <View styleHome={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text >SnapToCodeDemo App</Text>
      
      
      
    </View>
  );
}

const styleHome = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    backgroundColor: 'whitesmoke',
    color: '#4A90E2',
    fontSize: 24,
    padding: 10,
  },
})