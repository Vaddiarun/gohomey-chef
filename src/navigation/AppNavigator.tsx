import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { C } from '../theme';
import { FloatingTabBar } from './FloatingTabBar';
import { AuthProvider, useAuth, getApplicationStatus } from '../context/AuthContext';
import { SocialProvider } from '../context/SocialContext';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: C.bg,
    card: C.surface,
    text: C.text,
    border: C.border,
    primary: C.primary,
  },
};
import {
  DashboardScreen,
  CatalogHistoryScreen,
  OrdersScreen,
  CreateSlotScreen,
  ProfileScreen,
  ProofUploadScreen,
  LoginScreen,
  VerificationScreen,
  LogoutScreen,
  EditProfileScreen,
  WalletScreen,
  WithdrawScreen,
  WithdrawStatusScreen,
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
  FuelDashboardScreen,
  FuelSubscribersScreen,
  FuelWeighInScreen,
  FuelPlanDetailScreen,
  DailyMenuScreen,
  MealDetailScreen,
  SuccessScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const DashboardStack = createNativeStackNavigator();

/** Dashboard tab: home + Orders, so the floating tab bar stays visible on Orders. */
function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg } }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name="Orders" component={OrdersScreen} />
    </DashboardStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNavigator} />
      <Tab.Screen name="Daily" component={DailyMenuScreen} />
      <Tab.Screen name="Fuel" component={FuelDashboardScreen} />
      <Tab.Screen name="Pantry" component={PantryScreen} />
      <Tab.Screen name="Social" component={SocialEventsScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  // Always start on Login. The OTP verify response decides what comes next:
  // a new user (or unfinished signup) is sent to the right RegisterStep from
  // VerificationScreen, an existing chef goes to the dashboard / status screen.
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg } }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Verification" component={VerificationScreen} />
      <AuthStack.Screen name="RegisterStep1" component={RegisterStep1} />
      <AuthStack.Screen name="RegisterStep2" component={RegisterStep2} />
      <AuthStack.Screen name="RegisterStep3" component={RegisterStep3} />
      <AuthStack.Screen name="RegistrationStatus" component={RegistrationStatusScreen} />
    </AuthStack.Navigator>
  );
}

/** Authenticated chef whose application is not yet APPROVED — no dashboard access. */
function PendingReviewNavigator() {
  const { user } = useAuth();
  const status = user?.application_status ?? user?.status;
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.surface } }}>
      <AuthStack.Screen
        name="RegistrationStatus"
        component={RegistrationStatusScreen}
        initialParams={{ status }}
      />
      {/* "Re-upload document" from the Rejected state. */}
      <AuthStack.Screen name="RegisterStep3" component={RegisterStep3} />
    </AuthStack.Navigator>
  );
}

function AppNavigatorInner() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Only an admin-APPROVED chef may enter the dashboard. Anything else — in
  // review, rejected, or a status we couldn't confirm — stays on the status
  // screen (fail closed; "Check for updates" re-fetches the profile).
  const pendingReview = isAuthenticated && getApplicationStatus(user) !== 'APPROVED';

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : pendingReview ? (
          <Stack.Screen name="PendingReview" component={PendingReviewNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="WithdrawStatus" component={WithdrawStatusScreen} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen 
              name="Logout" 
              component={LogoutScreen} 
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false, animation: 'slide_from_right' }} />
          </>
        )}
        
        {/* Public or shared modals */}
        <Stack.Screen
          name="CreateSlot"
          component={CreateSlotScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="MealDetail"
          component={MealDetailScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Success"
          component={SuccessScreen}
          options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="ManageSchedule"
          component={DailyMenuScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProofUpload"
          component={ProofUploadScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddPantryItem"
          component={AddPantryItemScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="EventDetail" 
          component={EventDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Subscriptions"
          component={SubscriptionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CatalogHistory"
          component={CatalogHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FuelSubscribers"
          component={FuelSubscribersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FuelWeighIn"
          component={FuelWeighInScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="FuelPlanDetail"
          component={FuelPlanDetailScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
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
