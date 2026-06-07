import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { ChefTip } from '../components/ChefTip';
import {
  User,
  HelpCircle,
  LogOut,
  ChevronRight
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { resolveImageSource } from '../utils/media';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const SUPPORT_EMAIL = 'gohomeyybengaluru@gmail.com';

  const handleHelpAndSupport = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=Chef App Support Request&body=Hi GoHomeyy Team,%0A%0AChef Name: ${user?.name || ''}%0APhone: ${user?.phone || ''}%0A%0APlease describe your issue below:%0A`
    );
  };

  useEffect(() => {
    if (user) {
      console.log('Chef Profile:', JSON.stringify(user, null, 2));
    }
  }, [user]);
  const getImageUrl = (url?: string) => resolveImageSource(url) ?? undefined;

  const menuItems = [
    { id: '1', title: 'Profile', subtitle: 'Manage personal info & avatar', icon: User, color: Colors.primary },
    { id: '3', title: 'Help & Support', subtitle: 'gohomeyybengaluru@gmail.com', icon: HelpCircle, color: Colors.cyan },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.screenTitle}>GoHomeyy Chef</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.kitchen_photo_url ? (
                <Image
                  source={getImageUrl(user.kitchen_photo_url)}
                  style={styles.avatarImage}
                />
              ) : (
                <User size={40} color={Colors.primary} />
              )}
            </View>
          </View>
          <Text style={styles.chefName}>{user?.name || 'Chef'}</Text>
          <Text style={styles.chefPhone}>{user?.phone || 'No phone number'}</Text>
          {user?.kitchen_name && (
            <Text style={styles.kitchenName}>{user.kitchen_name}</Text>
          )}
        </View>

        {/* Bio Section */}
        {user?.bio && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>CHEF BIO</Text>
            <View style={styles.cardContent}>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          </View>
        )}

        {/* Expertise Section */}
        {user?.expertise && user.expertise.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>AREAS OF EXPERTISE</Text>
            <View style={styles.tagContainer}>
              {user.expertise.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Account Management */}
        <Text style={styles.sectionHeader}>ACCOUNT MANAGEMENT</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                if (item.title === 'Profile') navigation.navigate('EditProfile');
                if (item.title === 'Help & Support') handleHelpAndSupport();
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <item.icon size={20} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Logout')}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <LogOut size={20} color={Colors.danger} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuTitle, { color: Colors.danger }]}>Logout</Text>
              <Text style={styles.menuSubtitle}>Securely sign out of session</Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ChefTip tip="Need help? Email us at gohomeyybengaluru@gmail.com — our team responds within 24 hours on working days." />

        <View style={styles.footer}>
          <Text style={styles.versionText}>GOHOMEYY CHEF V2.4.1</Text>
          <TouchableOpacity onPress={handleHelpAndSupport} style={styles.contactRow}>
            <HelpCircle size={12} color={Colors.cyan} />
            <Text style={styles.contactEmail}>gohomeyybengaluru@gmail.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  headerTitleContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  screenTitle: {
    ...Typography.h1,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  chefName: {
    ...Typography.h2,
    fontSize: 22,
    marginBottom: 4,
  },
  chefPhone: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  kitchenName: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  sectionHeader: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.body,
    fontWeight: 'bold',
  },
  menuSubtitle: {
    ...Typography.caption,
    fontSize: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 8,
  },
  versionText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactEmail: {
    color: Colors.cyan,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  cardContent: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bioText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  tagText: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
