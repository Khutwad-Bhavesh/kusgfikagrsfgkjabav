import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Chatbot from './chatbot';

const FloatingChatButton: React.FC = () => {
  const [isChatbotVisible, setIsChatbotVisible] = useState(false);

  const openChatbot = () => {
    setIsChatbotVisible(true);
  };

  const closeChatbot = () => {
    setIsChatbotVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.floatingButton} onPress={openChatbot}>
        <View style={styles.buttonContent}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </View>
      </TouchableOpacity>
      
      <Chatbot visible={isChatbotVisible} onClose={closeChatbot} />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FloatingChatButton;