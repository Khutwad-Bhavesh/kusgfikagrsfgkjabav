import { Stack } from 'expo-router';

export default function ContentLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="news" 
        options={{ 
          title: 'News & Updates',
          headerStyle: { backgroundColor: '#16a34a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
    </Stack>
  );
}