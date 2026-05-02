import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  StatusBarStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { 
  Clock, 
  Phone, 
  ShieldCheck, 
  CheckCircle, 
  XCircle,
  LogOut,
  RefreshCw
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

export const RegistrationStatusScreen = ({ navigation, route }: any) => {
  const status = route?.params?.status || 'PENDING_REVIEW';
  const phone = route?.params?.phone;

  const getStatusConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: <CheckCircle size={48} color={Colors.primary} />,
          title: 'Welcome, Chef!',
          description: 'Your application has been approved. You are ready to start managing your atelier and taking orders.',
          bgColor: 'rgba(74, 222, 128, 0.1)',
          step: 4
        };
      case 'PENDING_REVIEW':
        return {
          icon: <Clock size={48} color={Colors.primary} />,
          title: 'Under Review',
          description: 'Our concierge team is reviewing your documents. This usually takes less than 24 hours.',
          bgColor: 'rgba(74, 222, 128, 0.1)',
          step: 1
        };
      case 'PHONE_VETTING':
        return {
          icon: <Phone size={48} color="#06B6D4" />,
          title: 'Phone Vetting',
          description: 'We will be reaching out to you for a brief introductory call to verify your profile details.',
          bgColor: 'rgba(6, 182, 212, 0.1)',
          step: 2
        };
      case 'KITCHEN_AUDIT':
        return {
          icon: <ShieldCheck size={48} color="#F59E0B" />,
          title: 'Kitchen Audit',
          description: 'A safety inspection of your kitchen workspace is in progress. We will notify you of the results soon.',
          bgColor: 'rgba(245, 158, 11, 0.1)',
          step: 3
        };
      case 'REJECTED':
        return {
          icon: <XCircle size={48} color="#EF4444" />,
          title: 'Application Declined',
          description: 'Unfortunately, your application was not approved at this time. Please contact support for more details.',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          step: 0
        };
      default:
        return {
          icon: <Clock size={48} color={Colors.primary} />,
          title: 'Application Status',
          description: 'We are processing your application. Please check back later.',
          bgColor: 'rgba(74, 222, 128, 0.1)',
          step: 1
        };
    }
  };

  const config = getStatusConfig();
  const { login } = useAuth();
  const token = route?.params?.token;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>GO HOMEYY</Text>
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <LogOut size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.statusIconContainer, { backgroundColor: config.bgColor }]}>
          {config.icon}
        </View>

        <Text style={styles.statusTitle}>{config.title}</Text>
        <Text style={styles.statusDescription}>{config.description}</Text>

        <View style={styles.timeline}>
          {[
            { label: 'Documents Submitted', active: config.step >= 1 },
            { label: 'Phone Vetting', active: config.step >= 2 },
            { label: 'Kitchen Audit', active: config.step >= 3 },
            { label: 'Final Approval', active: config.step >= 4 }
          ].map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={[
                styles.dot, 
                item.active && styles.activeDot,
                index === 0 && { marginTop: 0 }
              ]} />
              {index < 3 && <View style={[styles.line, item.active && styles.activeLine]} />}
              <Text style={[styles.timelineLabel, item.active && styles.activeLabel]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.supportBox}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>Contact our support team at concierge@gohomeyy.com</Text>
        </View>

        {status === 'APPROVED' ? (
          <TouchableOpacity 
            style={styles.refreshBtn}
            onPress={() => {
              console.log('Navigation: Status screen manually jumping to Dashboard');
              login(token);
            }}
          >
            <CheckCircle size={20} color={Colors.background} style={{ marginRight: 8 }} />
            <Text style={styles.refreshText}>GO TO DASHBOARD</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.refreshBtn}
            onPress={() => {
              // Logic to re-check status could go here
              Toast.show({ type: 'info', text1: 'Status Updated', text2: 'No changes detected yet.' });
            }}
          >
            <RefreshCw size={20} color={Colors.background} style={{ marginRight: 8 }} />
            <Text style={styles.refreshText}>CHECK FOR UPDATES</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    letterSpacing: 4,
    color: Colors.text,
  },
  logoutBtn: {
    padding: 8,
  },
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  statusTitle: {
    ...Typography.h1,
    fontSize: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  statusDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: Spacing.md,
  },
  timeline: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    marginBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 60,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  line: {
    position: 'absolute',
    left: 5,
    top: 12,
    width: 2,
    height: 48,
    backgroundColor: Colors.border,
  },
  activeLine: {
    backgroundColor: Colors.primary,
  },
  timelineLabel: {
    ...Typography.caption,
    marginLeft: 24,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeLabel: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  supportBox: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  supportTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  supportText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  refreshBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
