import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:reliefchain/screens/payment/payments_screen.dart';
import 'package:reliefchain/screens/user/eligibility_screen.dart';
import 'package:reliefchain/screens/utils/more_screen.dart';
import 'package:reliefchain/widgets/bottom_nav_bar.dart';

import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import 'dashboard_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int selectedIndex = 0;

  late final List<Widget> pages;

  @override
  void initState() {
    super.initState();

    pages = const [
      DashboardScreen(),
      PaymentsScreen(),
      EligibilityScreen(),
      MoreScreen(),
    ];
  }

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
      backgroundColor: const Color(0xff121214),

      appBar: AppBar(
        title: Text(
          switch (selectedIndex) {
            0 => 'ReliefChain',
            1 => 'Payments',
            2 => 'Eligibility',
            _ => 'More',
          },
        ),
        actions: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          ),
        ],
      ),

      body: IndexedStack(
        index: selectedIndex,
        children: pages,
      ),

      bottomNavigationBar: ReliefChainNavBar(
        selectedIndex: selectedIndex,
        onTap: (index) {
          setState(() {
            selectedIndex = index;
          });
        },
      ),
    );
  }
}