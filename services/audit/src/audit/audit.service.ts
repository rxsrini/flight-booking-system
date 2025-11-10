import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditLog, AuditAction, AuditSeverity } from '@flight-booking/database';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async createAuditLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create(createAuditLogDto);
      const savedLog = await this.auditLogRepository.save(auditLog);

      // Log critical events
      if (createAuditLogDto.severity === AuditSeverity.CRITICAL) {
        this.logger.warn(
          `CRITICAL AUDIT EVENT: ${createAuditLogDto.action} by user ${createAuditLogDto.userId || 'anonymous'}`,
        );
      }

      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  async logUserAction(
    action: AuditAction,
    userId: string,
    userEmail: string,
    userRole: string,
    options?: {
      entityType?: string;
      entityId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
      ipAddress?: string;
      userAgent?: string;
      severity?: AuditSeverity;
      description?: string;
    },
  ): Promise<AuditLog> {
    return this.createAuditLog({
      action,
      userId,
      userEmail,
      userRole,
      ...options,
    });
  }

  async logSystemEvent(
    action: AuditAction,
    options: {
      service?: string;
      entityType?: string;
      entityId?: string;
      metadata?: any;
      severity?: AuditSeverity;
      description?: string;
      success?: boolean;
      errorMessage?: string;
    },
  ): Promise<AuditLog> {
    return this.createAuditLog({
      action,
      ...options,
    });
  }

  async logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    options?: {
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
    },
  ): Promise<AuditLog> {
    return this.createAuditLog({
      action: AuditAction.API_REQUEST,
      method,
      endpoint,
      statusCode,
      duration,
      severity: statusCode >= 500 ? AuditSeverity.HIGH : AuditSeverity.LOW,
      success: statusCode < 400,
      ...options,
    });
  }

  async findAll(queryDto: AuditQueryDto) {
    const {
      action,
      userId,
      entityType,
      entityId,
      severity,
      startDate,
      endDate,
      service,
      userEmail,
      userRole,
      success,
      search,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'DESC',
    } = queryDto;

    const query = this.auditLogRepository.createQueryBuilder('audit');

    // Filters
    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }

    if (entityType) {
      query.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (severity) {
      query.andWhere('audit.severity = :severity', { severity });
    }

    if (service) {
      query.andWhere('audit.service = :service', { service });
    }

    if (userEmail) {
      query.andWhere('audit.userEmail = :userEmail', { userEmail });
    }

    if (userRole) {
      query.andWhere('audit.userRole = :userRole', { userRole });
    }

    if (success !== undefined) {
      query.andWhere('audit.success = :success', { success });
    }

    // Date range
    if (startDate && endDate) {
      query.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('audit.timestamp >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('audit.timestamp <= :endDate', { endDate });
    }

    // Search in description, userEmail, entityType
    if (search) {
      query.andWhere(
        '(audit.description ILIKE :search OR audit.userEmail ILIKE :search OR audit.entityType ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    query.orderBy(`audit.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate && endDate) {
      query.where('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Total logs
    const total = await query.getCount();

    // By action
    const byAction = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    // By severity
    const bySeverity = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.severity')
      .getRawMany();

    // By user
    const byUser = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.userEmail', 'userEmail')
      .addSelect('COUNT(*)', 'count')
      .where('audit.userEmail IS NOT NULL')
      .groupBy('audit.userEmail')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Failed operations
    const failedCount = await this.auditLogRepository.count({
      where: { success: false },
    });

    // Critical events
    const criticalCount = await this.auditLogRepository.count({
      where: { severity: AuditSeverity.CRITICAL },
    });

    // Recent activity (last 24 hours)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentActivity = await this.auditLogRepository.count({
      where: {
        timestamp: Between(last24Hours, new Date()),
      },
    });

    return {
      total,
      byAction,
      bySeverity,
      topUsers: byUser,
      failedCount,
      criticalCount,
      recentActivity,
    };
  }

  async getUserActivityTimeline(userId: string, limit: number = 50) {
    const logs = await this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      timestamp: log.timestamp,
      success: log.success,
      severity: log.severity,
    }));
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { timestamp: 'ASC' },
    });
  }

  async getSecurityEvents(limit: number = 100) {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.PERMISSION_DENIED,
      AuditAction.SENSITIVE_DATA_ACCESSED,
    ];

    return this.auditLogRepository.find({
      where: { action: In(securityActions) },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Deleted ${result.affected} audit logs older than ${daysToKeep} days`);

    return result.affected || 0;
  }
}
