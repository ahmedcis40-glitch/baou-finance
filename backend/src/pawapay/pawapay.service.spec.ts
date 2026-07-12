import { Test, TestingModule } from '@nestjs/testing';
import { PawaPayService } from './pawapay.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PawaPayTxStatus, PawaPayTxType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PawaPayService', () => {
  let service: PawaPayService;
  let prismaService: any;
  let walletsService: any;

  // Mock global fetch
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    // Reset global fetch mock before each test
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Prisma service mocks
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
      pawaPayTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    // Wallets service mocks
    walletsService = {
      depositCash: jest.fn(),
      withdrawCash: jest.fn(),
      getCashWallet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PawaPayService,
        { provide: PrismaService, useValue: prismaService },
        { provide: WalletsService, useValue: walletsService },
      ],
    }).compile();

    service = module.get<PawaPayService>(PawaPayService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('detectCorrespondent', () => {
    it('should detect Wave CI', () => {
      // Test prefix cleanups and detect WAVE_CIV
      const res = (service as any).detectCorrespondent('+225 07 01 02 03 04');
      expect(res.correspondent).toBe('WAVE_CIV');
      expect(res.country).toBe('CIV');
    });

    it('should detect MTN CI', () => {
      const res = (service as any).detectCorrespondent('05 01 02 03 04');
      expect(res.correspondent).toBe('MTN_MOMO_CIV');
      expect(res.country).toBe('CIV');
    });

    it('should detect Orange CI', () => {
      const res = (service as any).detectCorrespondent('01 01 02 03 04');
      expect(res.correspondent).toBe('ORANGE_CIV');
      expect(res.country).toBe('CIV');
    });

    it('should fallback to Ghana MTN for unknown prefixes in sandbox', () => {
      const res = (service as any).detectCorrespondent('+33 6 12 34 56 78');
      expect(res.correspondent).toBe('MTN_MOMO_GHA');
      expect(res.country).toBe('GHA');
    });
  });

  describe('initiateDeposit', () => {
    const mockUserId = 'user-123';

    it('should throw BadRequestException if amount is <= 0', async () => {
      await expect(service.initiateDeposit(mockUserId, 0))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not approved', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'EN_ATTENTE_VALIDATION' });

      await expect(service.initiateDeposit(mockUserId, 1000))
        .rejects.toThrow(BadRequestException);
    });

    it('should call PawaPay Checkout API (v2 widget) first if token exists', async () => {
      process.env.PAWAPAY_API_TOKEN = 'mock-api-token';
      process.env.PAWAPAY_ENVIRONMENT = 'sandbox';

      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'APPROUVE', phone: '2250700000000' });
      prismaService.pawaPayTransaction.create.mockResolvedValue({
        idInternal: 'tx-internal-123',
        userId: mockUserId,
        amount: 5000,
        status: PawaPayTxStatus.EN_COURS,
      });

      // Mock success response from widget sessions API
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ redirectUrl: 'https://checkout.pawapay.com/pay' }),
      });

      const result = await service.initiateDeposit(mockUserId, 5000);

      expect(prismaService.pawaPayTransaction.create).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/widget/sessions'),
        expect.any(Object)
      );
      expect(result.paymentUrl).toBe('https://checkout.pawapay.com/pay');
      expect(result.mode).toBe('pawapay_live');
    });

    it('should fallback to direct API and succeed if widget checkout fails', async () => {
      process.env.PAWAPAY_API_TOKEN = 'mock-api-token';
      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'APPROUVE', phone: '2250700000000' });
      prismaService.pawaPayTransaction.create.mockResolvedValue({
        idInternal: 'tx-internal-123',
        userId: mockUserId,
        amount: 5000,
        status: PawaPayTxStatus.EN_COURS,
      });

      // First fetch call (widget sessions) fails (400)
      // Second fetch call (direct deposits) succeeds (200)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Widget Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ depositId: 'pawapay-dep-789', status: 'ACCEPTED' }),
        });

      const result = await service.initiateDeposit(mockUserId, 5000);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.pawaPayDepositId).toBe('pawapay-dep-789');
      expect(result.mode).toBe('pawapay_direct');
    });

    it('should use sandbox demo simulator url if API token is not configured', async () => {
      delete process.env.PAWAPAY_API_TOKEN;
      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'APPROUVE', phone: '2250700000000' });
      prismaService.pawaPayTransaction.create.mockResolvedValue({
        idInternal: 'tx-internal-123',
        userId: mockUserId,
        amount: 5000,
        status: PawaPayTxStatus.EN_COURS,
      });

      const result = await service.initiateDeposit(mockUserId, 5000);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.paymentUrl).toContain('sandbox.pawapay.cloud/demo/pay');
      expect(result.mode).toBe('sandbox_simulation');
    });
  });

  describe('initiateWithdrawal', () => {
    const mockUserId = 'user-123';

    it('should throw BadRequestException if wallet balance is insufficient', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'APPROUVE', phone: '2250700000000' });
      walletsService.getCashWallet.mockResolvedValue({ balanceAvailable: 2000 });

      await expect(service.initiateWithdrawal(mockUserId, 5000))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a withdrawal transaction and call Payouts API', async () => {
      process.env.PAWAPAY_API_TOKEN = 'mock-api-token';
      prismaService.user.findUnique.mockResolvedValue({ id: mockUserId, kycStatus: 'APPROUVE', phone: '2250700000000' });
      walletsService.getCashWallet.mockResolvedValue({ balanceAvailable: 10000 });
      prismaService.pawaPayTransaction.create.mockResolvedValue({
        idInternal: 'tx-wd-999',
        userId: mockUserId,
        amount: 4000,
        status: PawaPayTxStatus.EN_COURS,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ payoutId: 'pawapay-payout-555', status: 'ACCEPTED' }),
      });
      const result = await service.initiateWithdrawal(mockUserId, 4000);

      expect(prismaService.pawaPayTransaction.create).toHaveBeenCalled();
      expect(walletsService.withdrawCash).toHaveBeenCalledWith(mockUserId, 4000);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/payouts'),
        expect.any(Object)
      );
      expect(result.transactionId).toBe('tx-wd-999');
      expect(result.mode).toBe('pawapay_live');
    });
  });

  describe('handleWebhook', () => {
    it('should credit cash wallet on completed deposit webhook', async () => {
      const mockTx = {
        idInternal: 'tx-123',
        userId: 'user-123',
        amount: 25000,
        type: PawaPayTxType.DEPOT,
        status: PawaPayTxStatus.EN_COURS,
      };

      prismaService.pawaPayTransaction.findUnique.mockResolvedValue(mockTx);

      const payload = {
        depositId: 'tx-123',
        status: 'COMPLETED',
        amount: 25000,
      };

      await service.handleWebhook(payload);

      expect(prismaService.pawaPayTransaction.update).toHaveBeenCalledWith({
        where: { idInternal: 'tx-123' },
        data: { idPawaPay: 'tx-123', status: PawaPayTxStatus.SUCCES },
      });
      expect(walletsService.depositCash).toHaveBeenCalledWith('user-123', 25000);
    });

    it('should not deduct wallet balance again on completed withdrawal webhook', async () => {
      const mockTx = {
        idInternal: 'tx-wd-456',
        userId: 'user-123',
        amount: 15000,
        type: PawaPayTxType.RETRAIT,
        status: PawaPayTxStatus.EN_COURS,
      };

      prismaService.pawaPayTransaction.findUnique.mockResolvedValue(mockTx);

      const payload = {
        payoutId: 'tx-wd-456',
        status: 'COMPLETED',
        amount: 15000,
      };

      await service.handleWebhook(payload);

      expect(prismaService.pawaPayTransaction.update).toHaveBeenCalledWith({
        where: { idInternal: 'tx-wd-456' },
        data: { idPawaPay: 'tx-wd-456', status: PawaPayTxStatus.SUCCES },
      });
      expect(walletsService.withdrawCash).not.toHaveBeenCalled();
    });

    it('should set status to ECHEC if webhook status is FAILED for deposit', async () => {
      const mockTx = {
        idInternal: 'tx-123',
        userId: 'user-123',
        amount: 25000,
        type: PawaPayTxType.DEPOT,
        status: PawaPayTxStatus.EN_COURS,
      };

      prismaService.pawaPayTransaction.findUnique.mockResolvedValue(mockTx);

      const payload = {
        depositId: 'tx-123',
        status: 'FAILED',
        amount: 25000,
      };

      await service.handleWebhook(payload);

      expect(prismaService.pawaPayTransaction.update).toHaveBeenCalledWith({
        where: { idInternal: 'tx-123' },
        data: { idPawaPay: 'tx-123', status: PawaPayTxStatus.ECHEC },
      });
      expect(walletsService.depositCash).not.toHaveBeenCalled();
    });

    it('should refund cash wallet on failed withdrawal webhook', async () => {
      const mockTx = {
        idInternal: 'tx-wd-789',
        userId: 'user-123',
        amount: 8000,
        type: PawaPayTxType.RETRAIT,
        status: PawaPayTxStatus.EN_COURS,
      };

      prismaService.pawaPayTransaction.findUnique.mockResolvedValue(mockTx);

      const payload = {
        payoutId: 'tx-wd-789',
        status: 'FAILED',
        amount: 8000,
      };

      await service.handleWebhook(payload);

      expect(prismaService.pawaPayTransaction.update).toHaveBeenCalledWith({
        where: { idInternal: 'tx-wd-789' },
        data: { idPawaPay: 'tx-wd-789', status: PawaPayTxStatus.ECHEC },
      });
      expect(walletsService.depositCash).toHaveBeenCalledWith('user-123', 8000);
    });
  });
});
