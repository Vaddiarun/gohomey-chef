import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { ShoppingBag, User, Utensils, LayoutGrid, ClipboardList, Package, Users } from 'lucide-react-native';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Colors, Typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SocialProvider } from '../context/SocialContext';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    primary: Colors.primary,
  },
};
import {
  DashboardScreen,
  OrdersScreen,
  CreateSlotScreen,
  ScheduleScreen,
  ProfileScreen,
  ProofUploadScreen,
  LoginScreen,
  VerificationScreen,
  LogoutScreen,
  EditProfileScreen,
  RegisterStep1,
  RegisterStep2,
  RegisterStep3,
  RegistrationStatusScreen,
  PantryScreen,
  AddPantryItemScreen,
  SocialEventsScreen,
  EventDetailScreen,
  CreateEventScreen,
  SubscriptionScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'android' ? 70 + Math.max(insets.bottom, 16) : 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let IconComponent: React.ElementType;
          if (route.name === 'Dashboard') IconComponent = LayoutGrid;
          else if (route.name === 'Orders') IconComponent = ClipboardList;
          else if (route.name === 'Pantry') IconComponent = Package;
          else if (route.name === 'Social') IconComponent = Users;
          else if (route.name === 'Profile') IconComponent = User;
          else IconComponent = LayoutGrid;
          
          return <IconComponent size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 16) : insets.bottom,
          paddingTop: 10,
        },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Pantry" component={PantryScreen} />
      <Tab.Screen name="Social" component={SocialEventsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Verification" component={VerificationScreen} />
      <AuthStack.Screen name="RegisterStep1" component={RegisterStep1} />
      <AuthStack.Screen name="RegisterStep2" component={RegisterStep2} />
      <AuthStack.Screen name="RegisterStep3" component={RegisterStep3} />
      <AuthStack.Screen name="RegistrationStatus" component={RegistrationStatusScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigatorInner() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="Logout" 
              component={LogoutScreen} 
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen} 
              options={{ 
                presentation: 'modal',
                headerShown: false
              }}
            />
          </>
        )}
        
        {/* Public or shared modals */}
        <Stack.Screen 
          name="CreateSlot" 
          component={CreateSlotScreen} 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Create Meal Slot',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18, color: Colors.text },
          }} 
        />
        <Stack.Screen 
          name="ManageSchedule" 
          component={ScheduleScreen} 
          options={{ 
            headerShown: true,
            headerTitle: 'Manage Schedule',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18, color: Colors.text },
          }} 
        />
        <Stack.Screen
          name="ProofUpload"
          component={ProofUploadScreen}
          options={{
            headerShown: true,
            headerTitle: 'Upload Proof',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18, color: Colors.text },
          }}
        />
        <Stack.Screen
          name="AddPantryItem"
          component={AddPantryItemScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Pantry Item',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18, color: Colors.text },
          }}
        />
        <Stack.Screen 
          name="EventDetail" 
          component={EventDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{
            headerShown: true,
            headerTitle: 'New Social Event',
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18, color: Colors.text },
          }}
        />
        <Stack.Screen
          name="Subscriptions"
          component={SubscriptionScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export const AppNavigator = () => (
  <AuthProvider>
    <SocialProvider>
      <AppNavigatorInner />
    </SocialProvider>
  </AuthProvider>
);
