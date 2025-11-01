package com.csy.springbootauthbe.wallet.service;

import com.csy.springbootauthbe.admin.dto.AdminDashboardDTO;
import com.csy.springbootauthbe.wallet.dto.MonthlyEarningDTO;
import com.csy.springbootauthbe.wallet.entity.Wallet;
import com.csy.springbootauthbe.wallet.entity.WalletTransaction;
import com.csy.springbootauthbe.wallet.repository.WalletRepository;
import com.csy.springbootauthbe.wallet.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepo;
    private final WalletTransactionRepository txnRepo;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // ----------------------------------------------------------------------
    // Core wallet retrieval
    // ----------------------------------------------------------------------
    public Wallet getWallet(String userId) {
        return walletRepo.findByStudentId(userId)
                .orElseGet(() -> walletRepo.save(
                        new Wallet(null, userId, BigDecimal.ZERO, "SGD", null, false, LocalDateTime.now())
                ));
    }

    // ----------------------------------------------------------------------
    // PIN management
    // ----------------------------------------------------------------------

    /** Set a new wallet PIN (hashed with BCrypt). */
    public void setWalletPin(String studentId, String rawPin) {
        Wallet wallet = getWallet(studentId);
        wallet.setWalletPin(encoder.encode(rawPin));
        wallet.setPinSet(true);
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);
    }

    /** Verify wallet PIN against hashed value. */
    public boolean verifyWalletPin(String studentId, String rawPin) {
        Wallet wallet = getWallet(studentId);
        if (wallet.getWalletPin() == null) return false;
        return encoder.matches(rawPin, wallet.getWalletPin());
    }

    // ----------------------------------------------------------------------
    // Credit / debit operations
    // ----------------------------------------------------------------------

    /** Add credits to wallet (Stripe top-up success). */
    @Transactional
    public WalletTransaction addCredits(String userId, BigDecimal amount, String refId) {
        Wallet wallet = getWallet(userId);
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);

        WalletTransaction newTxn = new WalletTransaction(
            null, userId, "PURCHASE", amount,
            "Top-up credits", refId, LocalDateTime.now());

        txnRepo.save(newTxn);
        return newTxn;
    }

    /** Deduct credits for confirmed booking. */
    @Transactional
    public Wallet deductCredits(String userId, BigDecimal amount, String bookingId) {
        Wallet wallet = getWallet(userId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient credits");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);

        txnRepo.save(new WalletTransaction(
                null, userId, "BOOKING_DEDUCT", amount.negate(),
                "Booking charge", bookingId, LocalDateTime.now()
        ));
        return wallet;
    }

    /** Temporarily hold credits when booking created. */
    @Transactional
    public Wallet holdCredits(String studentId, BigDecimal amount, String bookingId) {
        Wallet wallet = getWallet(studentId);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient credits to hold for booking");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);

        txnRepo.save(new WalletTransaction(
                null, studentId, "BOOKING_HOLD", amount.negate(),
                "Hold for booking ID: " + bookingId, bookingId, LocalDateTime.now()
        ));
        return wallet;
    }

    /** Release funds to tutor (95%) and company wallet (5% commission). */
    @Transactional
    public void releaseToTutor(String studentId, String tutorId, BigDecimal amount, String bookingId) {
        BigDecimal commissionRate = new BigDecimal("0.05");
        BigDecimal commission = amount.multiply(commissionRate);
        BigDecimal tutorAmount = amount.subtract(commission);

        // 1️⃣ Credit tutor 95%
        Wallet tutorWallet = getWallet(tutorId);
        tutorWallet.setBalance(tutorWallet.getBalance().add(tutorAmount));
        tutorWallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(tutorWallet);

        txnRepo.save(new WalletTransaction(
                null, tutorId, "BOOKING_PAYMENT_TUTOR", tutorAmount,
                "Payment (95%) for booking ID: " + bookingId, bookingId, LocalDateTime.now()
        ));

        // 2️⃣ Credit 5% to company wallet
        Wallet companyWallet = getWallet("COMPANY_WALLET");
        companyWallet.setBalance(companyWallet.getBalance().add(commission));
        companyWallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(companyWallet);

        txnRepo.save(new WalletTransaction(
                null, "COMPANY_WALLET", "BOOKING_COMMISSION", commission,
                "5% commission from booking ID: " + bookingId, bookingId, LocalDateTime.now()
        ));

        // 3️⃣ Record final debit for student
        txnRepo.save(new WalletTransaction(
                null, studentId, "BOOKING_CONFIRMED", amount.negate(),
                "Booking confirmed - funds split to tutor and company", bookingId, LocalDateTime.now()
        ));
    }

    /** Refund credits to student (e.g. cancelled booking). */
    @Transactional
    public void refundStudent(String studentId, BigDecimal amount, String bookingId) {
        Wallet wallet = getWallet(studentId);
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);

        txnRepo.save(new WalletTransaction(
                null, studentId, "BOOKING_REFUND", amount,
                "Refund for cancelled booking ID: " + bookingId, bookingId, LocalDateTime.now()
        ));
    }

    // ----------------------------------------------------------------------
    // Withdrawal (simulated)
    // ----------------------------------------------------------------------

    /** Simulate withdrawal of all funds (no real Stripe movement). */
    @Transactional
    public Map<String, Object> simulateWithdrawal(String studentId) {
        Wallet wallet = getWallet(studentId);
        BigDecimal balance = wallet.getBalance();

        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return Map.of("message", "No funds available to withdraw", "balance", balance);
        }

        // Record withdrawal
        txnRepo.save(new WalletTransaction(
                null, studentId, "WITHDRAWAL", balance.negate(),
                "Withdrawal of all funds", "MOCK-" + UUID.randomUUID(), LocalDateTime.now()
        ));

        // Zero out wallet
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepo.save(wallet);

        return Map.of(
                "message", "Withdrawal successful",
                "withdrawnAmount", balance,
                "newBalance", wallet.getBalance()
        );
    }

    // ----------------------------------------------------------------------
    // Transaction retrieval
    // ----------------------------------------------------------------------
    public List<WalletTransaction> getTransactions(String userId) {
        return txnRepo.findByStudentIdOrderByCreatedAtDesc(userId);
    }

    public AdminDashboardDTO.TransactionMetrics getTransactionMetrics() {
        Double totalEarnings = Optional.ofNullable(txnRepo.getTotalEarnings()).orElse(0.0);
        Double commissionCollected = Optional.ofNullable(txnRepo.getTotalCommission()).orElse(0.0);

        WalletTransaction highestTxnEntity = txnRepo.getHighestTransaction();
        AdminDashboardDTO.TransactionSummary highestTransaction = highestTxnEntity != null
                ? AdminDashboardDTO.TransactionSummary.builder()
                .description(highestTxnEntity.getDescription())
                .amount(highestTxnEntity.getAmount().doubleValue())
                .build()
                : null;

        List<MonthlyEarningDTO> rawMonthly =
                txnRepo.getMonthlyEarnings();

        List<AdminDashboardDTO.MonthlyEarnings> monthlyEarnings = rawMonthly.stream()
                .filter(m -> m.get_id() != null) // <--- skip null months
                .map(m -> AdminDashboardDTO.MonthlyEarnings.builder()
                        .month(Month.of(m.get_id()).name())
                        .total(m.getTotal())
                        .build())
                .toList();

        return AdminDashboardDTO.TransactionMetrics.builder()
                .totalEarnings(totalEarnings)
                .commissionCollected(commissionCollected)
                .highestTransaction(highestTransaction)
                .monthlyEarnings(monthlyEarnings)
                .build();
    }
}
