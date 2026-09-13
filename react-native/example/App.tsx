import React, {useEffect, useState} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FFmpegKit,
  FFmpegKitConfig,
  ReturnCode,
} from 'react-native-ffmpeg-kit';

/**
 * Minimal harness to validate the New-Architecture TurboModule conversion:
 *  - getFFmpegVersion / getPlatform exercise promise-returning TurboModule methods
 *  - enableLogCallback exercises a codegen-typed event (FFmpegKitLogCallbackEvent)
 *  - FFmpegKit.execute('-version') exercises a full session round-trip
 */
export default function App(): React.JSX.Element {
  const [version, setVersion] = useState('…');
  const [platform, setPlatform] = useState('…');
  const [result, setResult] = useState('(not run)');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    FFmpegKitConfig.getFFmpegVersion().then(setVersion).catch(String);
    FFmpegKitConfig.getPlatform().then(setPlatform).catch(String);
    FFmpegKitConfig.enableLogCallback(log => {
      setLogs(prev => [...prev.slice(-40), log.getMessage()]);
    });
  }, []);

  const runCommand = async () => {
    setResult('running…');
    try {
      const session = await FFmpegKit.execute('-version');
      const rc = await session.getReturnCode();
      setResult(ReturnCode.isSuccess(rc) ? 'SUCCESS' : `FAILED (${rc})`);
    } catch (e) {
      setResult(`ERROR: ${String(e)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>react-native-ffmpeg-kit</Text>
        <Text style={styles.subtitle}>New Architecture · TurboModule</Text>

        <Row label="FFmpeg version" value={version} />
        <Row label="Platform" value={platform} />
        <Row label="ffmpeg -version" value={result} />

        <View style={styles.button}>
          <Button title="Run `ffmpeg -version`" onPress={runCommand} />
        </View>

        <Text style={styles.logsTitle}>Log events ({logs.length})</Text>
        {logs.map((line, i) => (
          <Text key={i} style={styles.logLine} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b0d10'},
  content: {padding: 20},
  title: {fontSize: 22, fontWeight: '700', color: '#f5f7fa'},
  subtitle: {fontSize: 13, color: '#8a94a6', marginBottom: 20},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2530',
  },
  label: {color: '#8a94a6'},
  value: {color: '#f5f7fa', fontWeight: '600', flexShrink: 1, textAlign: 'right'},
  button: {marginVertical: 16},
  logsTitle: {color: '#8a94a6', marginTop: 8, marginBottom: 4},
  logLine: {color: '#5cc8ff', fontSize: 11, fontFamily: 'Menlo'},
});
