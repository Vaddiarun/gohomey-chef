import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  SafeAreaView as RNAreaView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { LogOut, ExternalLink, ChefHat } from 'lucide-react-native';
import { ChefTip } from '../components/ChefTip';
import { useAuth } from '../context/AuthContext';

export const LogoutScreen = () => {
  const { logout } = useAuth();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerBrand}>THE VERDANT ATELIER</Text>
          <View style={styles.headerLine} />
        </View>

        <View style={styles.content}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <ChefHat size={60} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.label}>SESSION CONCLUDED</Text>
          <Text style={styles.title}>You have been logged out</Text>
          <Text style={styles.subtitle}>See you soon, Chef Sameer!</Text>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => logout()}
          >
            <Text style={styles.buttonText}>LOG BACK IN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exitLink}>
            <ExternalLink size={16} color={Colors.textSecondary} />
            <Text style={styles.exitText}>EXIT APP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ChefTip tip="Your mise-en-place for the morning service has been saved to the local cache. Rest well, Chef." />
          <View style={styles.bottomMeta}>
            <Text style={styles.copyright}>© 2024 GOHOMEYY</Text>
            <View style={styles.secureBadge}>
              <View style={styles.dot} />
              <Text style={styles.secureText}>SECURE SESSION</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    marginBottom: 60,
  },
  headerBrand: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 12,
  },
  headerLine: {
    width: 60,
    height: 1,
    backgroundColor: Colors.border,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: {
    marginBottom: 40,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 32,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  button: {
    backgroundColor: Colors.primary,
    width: '100%',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: {
    ...Typography.h3,
    color: Colors.background,
  },
  exitLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  bottomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  copyright: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  secureText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
});
