import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool textToSpeechEnabled = true;
  bool largerTextEnabled = false;

  Future<void> _logout() async {
    await context.read<AuthProvider>().logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Preferences',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 16),

          Card(
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(
                    Icons.volume_up_outlined,
                  ),
                  title: const Text('Text-to-Speech'),
                  subtitle: const Text(
                    'Read important information aloud',
                  ),
                  value: textToSpeechEnabled,
                  onChanged: (value) {
                    setState(() {
                      textToSpeechEnabled = value;
                    });
                  },
                ),

                const Divider(height: 1),

                SwitchListTile(
                  secondary: const Icon(
                    Icons.text_fields,
                  ),
                  title: const Text('Larger Text'),
                  subtitle: const Text(
                    'Use larger text across the app',
                  ),
                  value: largerTextEnabled,
                  onChanged: (value) {
                    setState(() {
                      largerTextEnabled = value;
                    });
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Language',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 16),

          Card(
            child: ListTile(
              leading: const Icon(
                Icons.language,
              ),
              title: const Text('Language'),
              subtitle: const Text('English'),
              trailing: const Icon(
                Icons.chevron_right,
              ),
              onTap: () {
                _showLanguageDialog();
              },
            ),
          ),

          const SizedBox(height: 24),

          const Text(
            'Privacy',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 16),

          Card(
            child: ListTile(
              leading: const Icon(
                Icons.privacy_tip_outlined,
              ),
              title: const Text('Privacy Information'),
              trailing: const Icon(
                Icons.chevron_right,
              ),
              onTap: _showPrivacyDialog,
            ),
          ),

          const SizedBox(height: 24),

          Card(
            child: ListTile(
              leading: const Icon(
                Icons.logout,
              ),
              title: const Text('Logout'),
              onTap: _logout,
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Choose Language'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('English'),
                onTap: () {
                  Navigator.pop(context);
                },
              ),
              ListTile(
                title: const Text('Hindi'),
                onTap: () {
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showPrivacyDialog() {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Privacy'),
          content: const Text(
            'ReliefChain only displays the beneficiary '
            'information required to show relief eligibility '
            'and payment status. Sensitive credentials and '
            'authentication tokens are not displayed here.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }
}