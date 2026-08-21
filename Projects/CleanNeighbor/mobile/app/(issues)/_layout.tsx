import { Stack } from 'expo-router';

export default function IssuesLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
     headerShown:false
        }} 
      />
    </Stack>
  );
}