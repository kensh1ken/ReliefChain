import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/screens/user/profile_screen.dart';
import 'package:reliefchain/screens/utils/settings_screen.dart';

import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  Future<void> _logout(BuildContext context) async {
    await context.read<AuthProvider>().logout();

    if (!context.mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'More',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),

        const SizedBox(height: 20),

        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(
                  Icons.person_outline,
                ),
                title: const Text('Profile'),
                trailing: const Icon(
                  Icons.chevron_right,
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ProfileScreen(),
                    ),
                  );
                },
              ),

              const Divider(height: 1),

              ListTile(
                leading: const Icon(
                  Icons.settings_outlined,
                ),
                title: const Text('Settings'),
                trailing: const Icon(
                  Icons.chevron_right,
                ),
                onTap: () {
                 Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const SettingsScreen(),
                    ),
                  );
                },
              ),

              const Divider(height: 1),

              ListTile(
                leading: const Icon(
                  Icons.logout,
                ),
                title: const Text('Logout'),
                onTap: () => _logout(context),
              ),
            ],
          ),
        ),
      ],
    );
  }
}