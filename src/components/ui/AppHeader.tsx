import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { C, T } from '../../theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

/** White 57px header with a round back button and centred title (Figma "header.grid"). */
export const AppHeader = ({ title, onBack, right }: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Text style={[T.headerTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {onBack ? (
          <PressableScale onPress={onBack} style={styles.back} pressedScale={0.9} hitSlop={8} accessibilityLabel="Go back">
            <ArrowLeft size={16} color={C.text} strokeWidth={2} />
          </PressableScale>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.headerBorder,
  },
  bar: {
    height: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    position: 'absolute',
    left: 60,
    right: 60,
    textAlign: 'center',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.backBtnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  right: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
});
