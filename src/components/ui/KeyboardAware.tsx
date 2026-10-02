import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleProp, View, ViewStyle } from 'react-native';

/** Current on-screen keyboard height (0 when hidden). */
export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
};

/**
 * Keeps inputs and footers above the keyboard. With edge-to-edge the Android
 * window no longer resizes, and KeyboardAvoidingView's "height" mode stays
 * shrunk after the keyboard closes — so on Android we pad by the measured
 * keyboard height and drop it back to 0 on hide.
 */
export const KeyboardAware = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => {
  const height = useKeyboardHeight();
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView behavior="padding" style={style}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={[style, { paddingBottom: height }]}>{children}</View>;
};
