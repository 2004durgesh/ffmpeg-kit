import React, { useCallback, useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FFmpegKitConfig } from 'react-native-ffmpeg-kit';
import { runTests, tests, type TestResult } from './src/integration/tests';

/**
 * Runs the on-device integration suite (src/integration/tests.ts) on launch.
 * Each result has a testID, and the summary is logged as one
 * `FFMPEGKIT_TESTS {...}` line so CI or a script can read it from the logs.
 */
export default function App(): React.JSX.Element {
  const [version, setVersion] = useState('…');
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const all = await runTests((result) => setResults((prev) => [...prev, result]));
    const passed = all.filter((r) => r.passed).length;
    console.log(
      `FFMPEGKIT_TESTS ${JSON.stringify({ passed, total: all.length, failures: all.filter((r) => !r.passed) })}`
    );
    setRunning(false);
  }, []);

  useEffect(() => {
    FFmpegKitConfig.getFFmpegVersion().then(setVersion).catch(String);
    run();
  }, [run]);

  const passed = results.filter((r) => r.passed).length;
  const done = !running && results.length === tests.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>react-native-ffmpeg-kit</Text>
        <Text style={styles.subtitle}>Nitro · C++ core · FFmpeg {version}</Text>

        <Text testID="summary" style={[styles.summary, done && passed === tests.length ? styles.pass : null]}>
          {done ? `${passed}/${tests.length} passed` : `running ${results.length + 1}/${tests.length}…`}
        </Text>

        {results.map((r, i) => (
          <View key={r.name} testID={`result-${i}`} style={styles.row}>
            <Text style={[styles.mark, r.passed ? styles.pass : styles.fail]}>{r.passed ? 'PASS' : 'FAIL'}</Text>
            <View style={styles.rowText}>
              <Text style={styles.name}>{r.name}</Text>
              {r.error ? <Text style={styles.error}>{r.error}</Text> : null}
            </View>
            <Text style={styles.ms}>{r.ms} ms</Text>
          </View>
        ))}

        <View style={styles.button}>
          <Button testID="run-tests" title="Run again" onPress={run} disabled={running} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d10' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#f5f7fa' },
  subtitle: { fontSize: 13, color: '#8a94a6', marginBottom: 16 },
  summary: { fontSize: 18, fontWeight: '700', color: '#f5f7fa', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2530',
  },
  mark: { width: 44, fontWeight: '700' },
  rowText: { flex: 1 },
  name: { color: '#f5f7fa' },
  error: { color: '#ff6b6b', fontSize: 12, marginTop: 2 },
  ms: { color: '#8a94a6', fontSize: 12, marginLeft: 8 },
  pass: { color: '#4cd964' },
  fail: { color: '#ff6b6b' },
  button: { marginVertical: 16 },
});
