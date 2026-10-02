import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { C } from '../../theme';
import { AppHeader } from './AppHeader';
import { ProgressBar } from './ProgressBar';
import { KeyboardAware } from './KeyboardAware';

type Props = {
  title?: string;
  onBack?: () => void;
  /** 0 → 1; omit to hide the bar. */
  progress?: number;
  progressFrom?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shell for the "Create Your Profile" steps: white header, 20px gutters,
 * gradient progress bar and a CTA pinned 89px above the bottom edge (as in Figma).
 */
export const OnboardingLayout = ({ title = 'Create Your Profile', onBack, progress, progressFrom, footer, children }: Props) => {
  const insets = useSafeAreaInsets();
  // Figma: 34px home-indicator area + 55px gap below the CTA.
  const footerBottom = Math.max(insets.bottom, 34) + 55;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <AppHeader title={title} onBack={onBack} />
      <KeyboardAware style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {progress !== undefined && <ProgressBar progress={progress} from={progressFrom} />}
          {children}
        </ScrollView>
        {footer && <View style={[styles.footer, { paddingBottom: footerBottom }]}>{footer}</View>}
      </KeyboardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: C.bg,
  },
});
