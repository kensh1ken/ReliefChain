import 'package:flutter/material.dart';
import 'package:reliefchain/screens/home/dashboard_screen.dart';
import 'package:reliefchain/screens/payment/payments_screen.dart';
import 'package:reliefchain/screens/user/eligibility_screen.dart';
import 'package:reliefchain/screens/utils/more_screen.dart';
import 'package:reliefchain/utils/colors.dart';
import 'package:reliefchain/widgets/bottom_nav_bar.dart';
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int selectedIndex = 0;

  static const List<Widget> pages = [
    DashboardScreen(),
    PaymentsScreen(),
    EligibilityScreen(),
    MoreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
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