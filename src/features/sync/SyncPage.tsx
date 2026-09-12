import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Steps,
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Alert,
  Modal,
  Checkbox,
  Space,
  Typography,
  Result,
  Progress,
  Badge,
  Input,
  Radio,
  Tooltip,
  Divider,
  Tabs,
  message,
  Statistic,
  Empty,
  Spin,
} from 'antd';
import {
  SwapOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  EyeOutlined,
  RollbackOutlined,
  ReloadOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuthStore } from '@/stores/useAuthStore';
import { PERMISSIONS } from '@/types/auth';
import {
  SyncPlan,
  SyncOperation,
  SyncExecution,
  SyncDirection,
  CompareSessionSummary,
  DryRunResult,
  ValidationSummary,
} from '@/types/sync';
import { syncApi } from '@/services/api/syncApi';
import { connectionApi } from '@/services/api/connectionApi';
import { SyncDiffDrawer } from './SyncDiffDrawer';

const { Text, Title, Paragraph } = Typography;

export const SyncPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasPermission } = useAuthStore();

  // Wizard Step
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0: Compare Sessions
  const [sessions, setSessions] = useState<CompareSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [connections, setConnections] = useState<any[]>([]);

  // Step 1: Direction & Strategy Options
  const [direction, setDirection] = useState<SyncDirection>('SourceToTarget');
  const [insertMissing, setInsertMissing] = useState(true);
  const [updateDifferent, setUpdateDifferent] = useState(true);
  const [deleteExtra, setDeleteExtra] = useState(false); // ALWAYS false by default
  const [batchSize, setBatchSize] = useState(100);
  const [skipConflicts, setSkipConflicts] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // Step 2: Plan & Operations
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [operationTab, setOperationTab] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [updatingSelection, setUpdatingSelection] = useState(false);

  // Operation Diff Drawer
  const [selectedOperation, setSelectedOperation] = useState<SyncOperation | null>(null);
  const [diffDrawerOpen, setDiffDrawerOpen] = useState(false);

  // Step 3: Validation & Dry Run
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationSummary | null>(null);
  const [runningDryRun, setRunningDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);

  // Step 4: Approval
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Step 5: Execution Confirmation
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Step 6: Live Execution Tracking
  const [execution, setExecution] = useState<SyncExecution | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  // Step 7: Rollback / Reversal
  const [creatingReversal, setCreatingReversal] = useState(false);

  // Check URL params on initial mount
  useEffect(() => {
    loadCompareSessions();
    loadConnections();

    const planIdParam = searchParams.get('planId');
    if (planIdParam) {
      loadPlanById(planIdParam);
    }
  }, []);

  const loadConnections = async () => {
    try {
      const res = await connectionApi.getConnections();
      setConnections(res || []);
    } catch {
      // ignore
    }
  };

  const loadCompareSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await syncApi.getCompareSessions(1, 20);
      setSessions(res.items || []);
      const sessionParam = searchParams.get('compareSessionId');
      if (sessionParam) {
        setSelectedSessionId(sessionParam);
      } else if (res.items && res.items.length > 0) {
        setSelectedSessionId(res.items[0].id);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load compare sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadPlanById = async (planId: string) => {
    setLoadingPlan(true);
    try {
      const p = await syncApi.getPlan(planId);
      setPlan(p);
      setSelectedSessionId(p.compareSessionId);
      setDirection(p.direction);
      setInsertMissing(p.options.insertMissing);
      setUpdateDifferent(p.options.updateDifferent);
      setDeleteExtra(p.options.deleteExtra);
      setBatchSize(p.options.batchSize);
      setSkipConflicts(p.options.skipConflicts);
      if (p.validation) setValidationResult(p.validation);
      if (p.dryRunResult) setDryRunResult(p.dryRunResult);

      await loadOperations(p.id, operationTab);
      setCurrentStep(2); // Jump to review
    } catch (err: any) {
      message.error(err.message || 'Failed to load plan');
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadOperations = async (planId: string, tab: string) => {
    setLoadingOperations(true);
    try {
      let opType: string | undefined;
      let status: string | undefined;
      if (tab === 'insert') opType = 'Insert';
      else if (tab === 'update') opType = 'Update';
      else if (tab === 'delete') opType = 'Delete';
      else if (tab === 'blocked') status = 'Blocked';

      const res = await syncApi.getPlanOperations(planId, {
        page: 1,
        pageSize: 100,
        operationType: opType,
        status: status,
      });
      setOperations(res.items || []);
    } catch (err: any) {
      message.error(err.message || 'Failed to load operations');
    } finally {
      setLoadingOperations(false);
    }
  };

  const handleTabChange = (key: string) => {
    setOperationTab(key);
    if (plan) {
      loadOperations(plan.id, key);
    }
  };

  // Step 1 -> Step 2: Generate Plan
  const handleGeneratePlan = async () => {
    if (!selectedSessionId) {
      message.warning('Please select a compare session first.');
      return;
    }

    setGeneratingPlan(true);
    try {
      const newPlan = await syncApi.createPlan({
        compareSessionId: selectedSessionId,
        direction,
        options: {
          insertMissing,
          updateDifferent,
          deleteExtra,
          batchSize,
          continueNextBatch: true,
          skipConflicts,
        },
      });
      setPlan(newPlan);
      setSearchParams({ planId: newPlan.id });
      await loadOperations(newPlan.id, 'all');
      setCurrentStep(2);
      message.success(`Sync Plan generated (${newPlan.totalOperations} operations)`);
    } catch (err: any) {
      message.error(err.message || 'Failed to generate sync plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Toggle single operation selection
  const handleToggleOperationSelection = async (op: SyncOperation) => {
    if (!plan) return;
    try {
      const updatedPlan = await syncApi.updateSelection(plan.id, {
        operationIds: [op.id],
        selected: !op.isSelected,
      });
      setPlan(updatedPlan);
      setOperations((prev) =>
        prev.map((item) => (item.id === op.id ? { ...item, isSelected: !op.isSelected } : item))
      );
    } catch (err: any) {
      message.error(err.message || 'Failed to update selection');
    }
  };

  // Bulk select / deselect for current tab
  const handleBulkSelection = async (select: boolean) => {
    if (!plan) return;
    setUpdatingSelection(true);
    try {
      let opType: string | undefined;
      if (operationTab === 'insert') opType = 'Insert';
      else if (operationTab === 'update') opType = 'Update';
      else if (operationTab === 'delete') opType = 'Delete';

      const updatedPlan = await syncApi.updateSelection(plan.id, {
        operationType: opType,
        selectAll: select ? true : undefined,
        deselectAll: !select ? true : undefined,
        selected: select,
      });
      setPlan(updatedPlan);
      await loadOperations(plan.id, operationTab);
      message.success(select ? 'Selected all operations in this view' : 'Deselected all operations in this view');
    } catch (err: any) {
      message.error(err.message || 'Failed to bulk update selection');
    } finally {
      setUpdatingSelection(false);
    }
  };

  // Step 2 -> Step 3: Run Validation
  const handleValidatePlan = async () => {
    if (!plan) return;
    setValidating(true);
    try {
      const val = await syncApi.validatePlan(plan.id);
      setValidationResult(val);
      const updatedPlan = await syncApi.getPlan(plan.id);
      setPlan(updatedPlan);
      if (val.isValid) {
        message.success('Validation passed without errors.');
      } else {
        message.warning(`Validation identified ${val.errors.length} error(s).`);
      }
    } catch (err: any) {
      message.error(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Step 3: Run Dry Run
  const handleRunDryRun = async () => {
    if (!plan) return;
    setRunningDryRun(true);
    try {
      const dryResult = await syncApi.runDryRun(plan.id);
      setDryRunResult(dryResult);
      const updatedPlan = await syncApi.getPlan(plan.id);
      setPlan(updatedPlan);
      if (dryResult.success) {
        message.success('Dry Run simulation passed successfully!');
      } else {
        message.error(`Dry Run failed: ${dryResult.message}`);
      }
    } catch (err: any) {
      message.error(err.message || 'Dry Run simulation failed');
    } finally {
      setRunningDryRun(false);
    }
  };

  // Step 4: Approval
  const handleApprovePlan = async () => {
    if (!plan) return;
    setApproving(true);
    try {
      const updated = await syncApi.approvePlan(plan.id, { comment: approvalComment });
      setPlan(updated);
      message.success('Sync plan approved successfully.');
      setCurrentStep(5); // Move to confirm
    } catch (err: any) {
      message.error(err.message || 'Failed to approve plan');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!plan || !rejectionReason.trim()) {
      message.warning('Please provide a reason for rejection.');
      return;
    }
    setRejecting(true);
    try {
      const updated = await syncApi.rejectPlan(plan.id, { reason: rejectionReason });
      setPlan(updated);
      message.info('Sync plan rejected.');
    } catch (err: any) {
      message.error(err.message || 'Failed to reject plan');
    } finally {
      setRejecting(false);
    }
  };

  // Step 5 -> Step 6: Execute Plan
  const handleExecutePlan = async () => {
    if (!plan) return;
    setExecuting(true);
    try {
      const exec = await syncApi.executePlan(plan.id);
      setExecution(exec);
      setCurrentStep(6); // Live execution progress
      startPollingExecution(exec.id);
    } catch (err: any) {
      message.error(err.message || 'Execution initiation failed');
    } finally {
      setExecuting(false);
    }
  };

  // Polling execution status
  const startPollingExecution = (executionId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = window.setInterval(async () => {
      try {
        const latest = await syncApi.getExecution(executionId);
        setExecution(latest);

        if (
          latest.status === 'Completed' ||
          latest.status === 'CompletedWithErrors' ||
          latest.status === 'Failed' ||
          latest.status === 'Cancelled'
        ) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setCurrentStep(7); // Jump to result
          if (latest.status === 'Completed') {
            message.success('Database synchronization completed successfully!');
          } else if (latest.status === 'CompletedWithErrors') {
            message.warning('Synchronization finished with errors.');
          } else {
            message.error(`Synchronization ${latest.status.toLowerCase()}.`);
          }
        }
      } catch {
        // Polling error handling
      }
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Cancel execution
  const handleCancelExecution = async () => {
    if (!execution) return;
    setCancelling(true);
    try {
      await syncApi.cancelExecution(execution.id);
      message.info('Cancellation request sent to background worker.');
    } catch (err: any) {
      message.error(err.message || 'Failed to cancel execution');
    } finally {
      setCancelling(false);
    }
  };

  // Step 7: Create Reversal Plan
  const handleCreateReversalPlan = async () => {
    if (!plan) return;
    setCreatingReversal(true);
    try {
      const res = await syncApi.createReversalPlan(plan.id);
      Modal.success({
        title: 'Reversal Plan Created',
        content: (
          <div>
            <p>{res.message}</p>
            <p>New Plan ID: <Text code>{res.newPlanId}</Text></p>
            <p>Operations count: <strong>{res.operationsCount}</strong></p>
            <p>The inverse operations will restore the target database to its pre-sync state.</p>
          </div>
        ),
        okText: 'Open Reversal Plan',
        onOk: () => {
          loadPlanById(res.newPlanId);
        },
      });
    } catch (err: any) {
      message.error(err.message || 'Failed to create reversal plan');
    } finally {
      setCreatingReversal(false);
    }
  };

  // Target database name and connection info
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const targetDbName =
    direction === 'SourceToTarget'
      ? selectedSession?.targetDatabase || plan?.targetDatabase || 'Target DB'
      : selectedSession?.sourceDatabase || plan?.sourceDatabase || 'Source DB';

  const sourceDbName =
    direction === 'SourceToTarget'
      ? selectedSession?.sourceDatabase || plan?.sourceDatabase || 'Source DB'
      : selectedSession?.targetDatabase || plan?.targetDatabase || 'Target DB';

  const targetConnId =
    direction === 'SourceToTarget'
      ? selectedSession?.targetConnectionId || plan?.targetConnectionId
      : selectedSession?.sourceConnectionId || plan?.sourceConnectionId;

  const targetConnection = connections.find((c) => c.id === targetConnId);
  const isTargetProduction = targetConnection?.environment === 'Production' || plan?.environment === 'Production';
  const isTargetWriteDisabled = targetConnection && !targetConnection.allowWrite;

  const steps = [
    { title: 'Compare Session' },
    { title: 'Direction & Strategy' },
    { title: 'Review Operations' },
    { title: 'Validation & Dry Run' },
    { title: 'Approval' },
    { title: 'Confirm' },
    { title: 'Executing' },
    { title: 'Result' },
  ];

  // Filtering operations
  const filteredOperations = operations.filter((op) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      op.tableName.toLowerCase().includes(kw) ||
      op.primaryKey.toLowerCase().includes(kw)
    );
  });

  const operationColumns = [
    {
      title: 'Sync',
      dataIndex: 'isSelected',
      key: 'isSelected',
      width: 60,
      render: (selected: boolean, op: SyncOperation) => (
        <Checkbox
          checked={selected}
          disabled={op.status === 'Blocked'}
          onChange={() => handleToggleOperationSelection(op)}
        />
      ),
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 70,
      render: (val: number) => <span style={{ color: '#64748b' }}>#{val}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (type: string) => {
        if (type === 'Insert') return <Tag color="success">INSERT</Tag>;
        if (type === 'Update') return <Tag color="processing">UPDATE</Tag>;
        if (type === 'Delete') return <Tag color="error">DELETE</Tag>;
        if (type === 'Blocked') return <Tag color="warning">BLOCKED</Tag>;
        return <Tag color="default">SKIP</Tag>;
      },
    },
    {
      title: 'Target Table',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (table: string, op: SyncOperation) => (
        <span className="font-mono" style={{ fontWeight: 600 }}>
          {op.schemaName}.{table}
        </span>
      ),
    },
    {
      title: 'Primary Key',
      dataIndex: 'primaryKey',
      key: 'primaryKey',
      render: (pk: string) => <span className="font-mono">{pk}</span>,
    },
    {
      title: 'Changed Fields',
      dataIndex: 'changedColumns',
      key: 'changedColumns',
      render: (cols: string[], op: SyncOperation) => {
        if (op.operationType === 'Insert') return <span style={{ color: '#16a34a' }}>New record in target</span>;
        if (op.operationType === 'Delete') return <span style={{ color: '#dc2626' }}>Record will be deleted</span>;
        if (!cols || cols.length === 0) return <span style={{ color: '#94a3b8' }}>—</span>;
        return (
          <Space wrap size={[4, 4]}>
            {cols.map((c) => (
              <Tag key={c} style={{ fontSize: 11 }}>{c}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (st: string) => {
        if (st === 'Success') return <Tag color="success">Success</Tag>;
        if (st === 'Failed') return <Tag color="error">Failed</Tag>;
        if (st === 'Blocked') return <Tag color="warning">Blocked</Tag>;
        if (st === 'Conflict') return <Tag color="gold">Conflict</Tag>;
        return <Tag color="default">Pending</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 100,
      render: (_: any, op: SyncOperation) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOperation(op);
            setDiffDrawerOpen(true);
          }}
        >
          Diff
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Database Sync Engine"
        subtitle="Controlled, transactional, multi-step synchronization between SQL Server databases."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Sync' }]}
        extra={
          <Space>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => navigate('/sync/history')}
            >
              Sync History
            </Button>
            {plan && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadPlanById(plan.id)}
              >
                Reload Plan
              </Button>
            )}
          </Space>
        }
      />

      {/* Steps Indicator */}
      <Card style={{ marginBottom: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <Steps current={currentStep} items={steps} size="small" />
      </Card>

      {/* ================= STEP 0: SELECT COMPARE SESSION ================= */}
      {currentStep === 0 && (
        <Card title="Step 1: Select Compare Session" style={{ borderRadius: 8 }}>
          <Paragraph type="secondary">
            Sync operations are built strictly from an existing Compare Session. Select a comparison below or open Compare to run a new one.
          </Paragraph>

          {loadingSessions ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : sessions.length === 0 ? (
            <Empty
              description="No completed compare sessions found. Please run a schema/data compare first."
              style={{ margin: '40px 0' }}
            >
              <Button type="primary" onClick={() => navigate('/compare')}>
                Go to Compare Page
              </Button>
            </Empty>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <Radio.Group
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {sessions.map((s) => (
                    <Card
                      key={s.id}
                      size="small"
                      hoverable
                      style={{
                        borderColor: selectedSessionId === s.id ? '#1677ff' : '#e2e8f0',
                        backgroundColor: selectedSessionId === s.id ? '#f0f7ff' : '#ffffff',
                      }}
                      onClick={() => setSelectedSessionId(s.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Radio value={s.id} />
                          <div>
                            <Text strong>{s.sourceDatabase}</Text>
                            <ArrowRightOutlined style={{ margin: '0 8px', color: '#64748b' }} />
                            <Text strong>{s.targetDatabase}</Text>
                          </div>
                        </Space>
                        <Space>
                          <Tag color="blue">{s.tablesWithDifferences} tables with differences</Tag>
                          <Tag color="purple">{s.totalDifferencesCount} total diffs</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(s.createdAt).toLocaleString()}
                          </Text>
                        </Space>
                      </div>
                    </Card>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => navigate('/compare')}>New Compare</Button>
            <Button
              type="primary"
              disabled={!selectedSessionId}
              onClick={() => setCurrentStep(1)}
            >
              Next: Direction & Strategy <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 1: DIRECTION & STRATEGY ================= */}
      {currentStep === 1 && (
        <Card title="Step 2: Sync Direction & Safety Strategy" style={{ borderRadius: 8 }}>
          {/* Highlight Target Box */}
          <Alert
            type={isTargetProduction ? 'error' : 'info'}
            showIcon
            icon={isTargetProduction ? <WarningOutlined /> : undefined}
            message={
              <span>
                Target Database to be Modified:{' '}
                <strong style={{ fontSize: 15 }}>{targetDbName}</strong>
                {isTargetProduction && <Tag color="red" style={{ marginLeft: 8 }}>PRODUCTION ENVIRONMENT</Tag>}
              </span>
            }
            description={
              <div>
                Data will flow from <strong>{sourceDbName}</strong> (read-only source) into{' '}
                <strong>{targetDbName}</strong> (target being modified).
                {isTargetWriteDisabled && (
                  <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 4 }}>
                    WARNING: Target connection has AllowWrite = false. Modifications will be blocked by write policy!
                  </div>
                )}
              </div>
            }
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card title="Sync Direction" size="small">
                <Radio.Group
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="SourceToTarget" style={{ padding: '8px 0' }}>
                      <Text strong>Source → Target</Text>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                        Propagate changes from {selectedSession?.sourceDatabase} to {selectedSession?.targetDatabase}.
                      </Paragraph>
                    </Radio>
                    <Divider style={{ margin: '4px 0' }} />
                    <Radio value="TargetToSource" style={{ padding: '8px 0' }}>
                      <Text strong>Target → Source (Reverse Sync)</Text>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                        Propagate changes from {selectedSession?.targetDatabase} back to {selectedSession?.sourceDatabase}.
                      </Paragraph>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Safety & Operation Options" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox
                    checked={insertMissing}
                    onChange={(e) => setInsertMissing(e.target.checked)}
                  >
                    <Text strong>Insert Missing Rows</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Add records that exist in source but are missing in target.
                    </Paragraph>
                  </Checkbox>

                  <Divider style={{ margin: '6px 0' }} />

                  <Checkbox
                    checked={updateDifferent}
                    onChange={(e) => setUpdateDifferent(e.target.checked)}
                  >
                    <Text strong>Update Different Rows</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Overwrite changed columns in target to match source values.
                    </Paragraph>
                  </Checkbox>

                  <Divider style={{ margin: '6px 0' }} />

                  <div>
                    <Checkbox
                      checked={deleteExtra}
                      onChange={(e) => setDeleteExtra(e.target.checked)}
                    >
                      <Text strong style={{ color: '#dc2626' }}>Delete Extra Rows in Target</Text>
                    </Checkbox>
                    <Paragraph type="secondary" style={{ margin: '2px 0 0 24px', fontSize: 12 }}>
                      Default OFF. Permanent removal of target records missing in source.
                    </Paragraph>
                    {deleteExtra && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Caution: Destructive Deletes Enabled"
                        description="Target records missing from the source database will be permanently DELETED."
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>

                  <Divider style={{ margin: '6px 0' }} />

                  <Checkbox
                    checked={skipConflicts}
                    onChange={(e) => setSkipConflicts(e.target.checked)}
                  >
                    <Text strong>Skip Conflicts Automatically</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Skip rows modified concurrently instead of aborting the batch.
                    </Paragraph>
                  </Checkbox>
                </Space>
              </Card>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => setCurrentStep(0)}>
              <ArrowLeftOutlined /> Back
            </Button>
            <Button
              type="primary"
              loading={generatingPlan}
              onClick={handleGeneratePlan}
            >
              Generate Sync Plan <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 2: REVIEW OPERATIONS ================= */}
      {currentStep === 2 && plan && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <span>Plan: {plan.id.substring(0, 8)}...</span>
                <Tag color={plan.status === 'Ready' ? 'green' : plan.status === 'Draft' ? 'blue' : 'orange'}>
                  {plan.status}
                </Tag>
                <Tag color="purple">v{plan.version}</Tag>
                {plan.environment === 'Production' && <Tag color="red">PRODUCTION</Tag>}
              </Space>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Target: <strong>{plan.targetDatabase}</strong>
              </Text>
            </div>
          }
          style={{ borderRadius: 8 }}
        >
          {/* Summary counters */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col span={4}>
              <Card size="small" style={{ background: '#f8fafc', textAlign: 'center' }}>
                <Statistic title="Total Operations" value={plan.totalOperations} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', textAlign: 'center' }}>
                <Statistic title="Inserts" value={plan.insertCount} valueStyle={{ color: '#16a34a' }} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ background: '#eff6ff', borderColor: '#bfdbfe', textAlign: 'center' }}>
                <Statistic title="Updates" value={plan.updateCount} valueStyle={{ color: '#2563eb' }} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ background: '#fef2f2', borderColor: '#fecaca', textAlign: 'center' }}>
                <Statistic title="Deletes" value={plan.deleteCount} valueStyle={{ color: '#dc2626' }} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ background: '#fffbeb', borderColor: '#fed7aa', textAlign: 'center' }}>
                <Statistic title="Blocked / Skipped" value={plan.blockedCount + plan.skippedCount} valueStyle={{ color: '#d97706' }} />
              </Card>
            </Col>
          </Row>

          {/* Filtering, search & bulk selection bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Tabs
              activeKey={operationTab}
              onChange={handleTabChange}
              style={{ marginBottom: 0 }}
              items={[
                { key: 'all', label: `All (${plan.totalOperations})` },
                { key: 'insert', label: `Inserts (${plan.insertCount})` },
                { key: 'update', label: `Updates (${plan.updateCount})` },
                { key: 'delete', label: `Deletes (${plan.deleteCount})` },
                { key: 'blocked', label: `Blocked (${plan.blockedCount})` },
              ]}
            />
            <Space>
              <Input
                placeholder="Search table or PK..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{ width: 220 }}
              />
              <Button
                size="small"
                loading={updatingSelection}
                onClick={() => handleBulkSelection(true)}
              >
                Select All
              </Button>
              <Button
                size="small"
                loading={updatingSelection}
                onClick={() => handleBulkSelection(false)}
              >
                Deselect All
              </Button>
            </Space>
          </div>

          <Table
            dataSource={filteredOperations}
            columns={operationColumns}
            rowKey="id"
            loading={loadingOperations}
            pagination={{ pageSize: 10 }}
            size="middle"
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => setCurrentStep(1)}>
              <ArrowLeftOutlined /> Back
            </Button>
            <Space>
              <Button
                type="primary"
                onClick={() => {
                  setCurrentStep(3);
                  handleValidatePlan();
                }}
              >
                Next: Validate & Dry Run <ArrowRightOutlined />
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* ================= STEP 3: VALIDATION & DRY RUN ================= */}
      {currentStep === 3 && plan && (
        <Card title="Step 4: Validation & Dry Run Simulation" style={{ borderRadius: 8 }}>
          <Row gutter={[24, 24]}>
            {/* Validation Panel */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <SafetyCertificateOutlined />
                    <span>Schema & Concurrency Validation</span>
                  </Space>
                }
                size="small"
                extra={
                  <Button
                    size="small"
                    loading={validating}
                    onClick={handleValidatePlan}
                  >
                    Re-Validate
                  </Button>
                }
              >
                {validationResult ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Tag color={validationResult.isValid ? 'success' : 'error'} style={{ fontSize: 13, padding: '4px 8px' }}>
                        {validationResult.isValid ? 'Validation Passed' : 'Validation Issues Found'}
                      </Tag>
                      <Text type="secondary">
                        {validationResult.validCount} valid / {validationResult.blockedCount} blocked
                      </Text>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <Alert
                        type="error"
                        showIcon
                        message="Errors Blocking Execution"
                        description={
                          <ul style={{ paddingLeft: 18, margin: 0 }}>
                            {validationResult.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        }
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    {validationResult.warnings.length > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Warnings"
                        description={
                          <ul style={{ paddingLeft: 18, margin: 0 }}>
                            {validationResult.warnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        }
                      />
                    )}

                    {validationResult.isValid && (
                      <Alert
                        type="success"
                        showIcon
                        message="All checks passed"
                        description="Target table write policies, schemas, and FK dependencies are verified."
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <Spin />
                  </div>
                )}
              </Card>
            </Col>

            {/* Dry Run Simulation Panel */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <Space>
                    <PlayCircleOutlined />
                    <span>Dry Run (Safe Simulation)</span>
                  </Space>
                }
                size="small"
                extra={
                  <Button
                    size="small"
                    type="primary"
                    loading={runningDryRun}
                    onClick={handleRunDryRun}
                  >
                    Execute Dry Run
                  </Button>
                }
              >
                {dryRunResult ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Tag color={dryRunResult.success ? 'success' : 'error'} style={{ fontSize: 13, padding: '4px 8px' }}>
                        {dryRunResult.success ? 'Dry Run Passed' : 'Dry Run Failed'}
                      </Tag>
                      <Text type="secondary">{dryRunResult.message}</Text>
                    </div>

                    <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#f0fdf4', textAlign: 'center' }}>
                          <Statistic title="Would Insert" value={dryRunResult.wouldInsert} valueStyle={{ fontSize: 16, color: '#16a34a' }} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#eff6ff', textAlign: 'center' }}>
                          <Statistic title="Would Update" value={dryRunResult.wouldUpdate} valueStyle={{ fontSize: 16, color: '#2563eb' }} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#fef2f2', textAlign: 'center' }}>
                          <Statistic title="Would Delete" value={dryRunResult.wouldDelete} valueStyle={{ fontSize: 16, color: '#dc2626' }} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small" style={{ background: '#fffbeb', textAlign: 'center' }}>
                          <Statistic title="Conflicts" value={dryRunResult.conflicts} valueStyle={{ fontSize: 16, color: '#d97706' }} />
                        </Card>
                      </Col>
                    </Row>

                    {/* Simulation Log Messages */}
                    <div
                      style={{
                        background: '#0f172a',
                        color: '#38bdf8',
                        padding: 12,
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        maxHeight: 140,
                        overflowY: 'auto',
                      }}
                    >
                      {dryRunResult.logMessages.map((log, idx) => (
                        <div key={idx}>&gt; {log}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Paragraph type="secondary">
                      Dry Run simulates the entire execution in an isolated transaction that is rolled back.
                    </Paragraph>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={runningDryRun}
                      onClick={handleRunDryRun}
                    >
                      Run Simulation Now
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => setCurrentStep(2)}>
              <ArrowLeftOutlined /> Back to Review
            </Button>
            <Button
              type="primary"
              disabled={!validationResult?.canExecute && !dryRunResult?.success}
              onClick={() => {
                // If approval is required, go to step 4, else step 5
                if (plan.approvalRequired || plan.status === 'AwaitingApproval') {
                  setCurrentStep(4);
                } else {
                  setCurrentStep(5);
                }
              }}
            >
              Next: {plan.approvalRequired || plan.status === 'AwaitingApproval' ? 'Approval Workflow' : 'Confirm Execution'}{' '}
              <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 4: APPROVAL WORKFLOW ================= */}
      {currentStep === 4 && plan && (
        <Card title="Step 5: Administrative Approval Workflow" style={{ borderRadius: 8 }}>
          <Alert
            type="warning"
            showIcon
            message="Two-Person Rule / Administrative Approval Required"
            description="This synchronization plan targets a Production or protected database. In accordance with enterprise change control policies, an independent administrator must review and approve this plan."
            style={{ marginBottom: 20 }}
          />

          <Card size="small" style={{ background: '#f8fafc', marginBottom: 20 }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">Plan Creator: </Text>
                <Text strong>{plan.createdByUsername}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Target Database: </Text>
                <Text strong className="font-mono">{plan.targetDatabase}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Environment: </Text>
                <Tag color={plan.environment === 'Production' ? 'red' : 'blue'}>{plan.environment}</Tag>
              </Col>
              <Col span={8}>
                <Text type="secondary">Dry Run Status: </Text>
                <Tag color={plan.dryRunResult?.success ? 'green' : 'orange'}>
                  {plan.dryRunResult?.success ? 'Simulated Successfully' : 'Not Simulated'}
                </Tag>
              </Col>
              <Col span={8}>
                <Text type="secondary">Plan Version: </Text>
                <Text strong>v{plan.version}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Current Status: </Text>
                <Tag color="gold">{plan.status}</Tag>
              </Col>
            </Row>
          </Card>

          {/* Two-person rule enforcement */}
          {user?.id === plan.createdByUserId ? (
            <Alert
              type="info"
              showIcon
              message="Two-Person Rule Notice"
              description="You created this sync plan. In accordance with safety policies, you cannot approve your own plan. Please share this Plan ID with another administrator for review."
              style={{ marginBottom: 20 }}
            />
          ) : hasPermission(PERMISSIONS.SYNC_APPROVE) ? (
            <div style={{ maxWidth: 600 }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Approval Comments (Optional):</Text>
                <Input.TextArea
                  rows={2}
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Enter notes on verification or change ticket reference..."
                  style={{ marginTop: 8 }}
                />
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={approving}
                  onClick={handleApprovePlan}
                >
                  Approve Plan
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={rejecting}
                  onClick={() => {
                    Modal.confirm({
                      title: 'Reject Sync Plan?',
                      content: (
                        <Input.TextArea
                          rows={2}
                          placeholder="Provide reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      ),
                      okText: 'Confirm Rejection',
                      okType: 'danger',
                      onOk: handleRejectPlan,
                    });
                  }}
                >
                  Reject Plan
                </Button>
              </Space>
            </div>
          ) : (
            <Alert
              type="error"
              showIcon
              message="Permission Required"
              description="You do not have the Sync.Approve permission required to approve this sync plan."
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => setCurrentStep(3)}>
              <ArrowLeftOutlined /> Back to Validation
            </Button>
            {plan.status === 'Approved' && (
              <Button type="primary" onClick={() => setCurrentStep(5)}>
                Next: Final Confirmation <ArrowRightOutlined />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ================= STEP 5: FINAL CONFIRMATION ================= */}
      {currentStep === 5 && plan && (
        <Card title="Step 6: Final Execution Confirmation" style={{ borderRadius: 8 }}>
          <Alert
            type={isTargetProduction ? 'error' : 'warning'}
            showIcon
            icon={<WarningOutlined />}
            message={
              <span>
                Caution: Executing Transactional Sync on{' '}
                <strong>{plan.targetDatabase}</strong>
              </span>
            }
            description="All selected operations will be executed in transactional batches on the target database. Audit records will capture pre- and post-sync snapshots."
            style={{ marginBottom: 20 }}
          />

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <Title level={5} style={{ marginTop: 0 }}>Execution Manifest</Title>
            <div>• Target Server / Database: <Text strong className="font-mono">{plan.targetDatabase}</Text></div>
            <div>• Operations: <strong>{plan.insertCount}</strong> Inserts, <strong>{plan.updateCount}</strong> Updates, <strong>{plan.deleteCount}</strong> Deletes</div>
            <div>• Batch Size: <strong>{plan.options.batchSize} rows per transaction</strong></div>
            <div>• Concurrency Check: <strong>Single-row affected verification enabled</strong></div>
          </div>

          {plan.deleteCount > 0 && (
            <Alert
              type="error"
              showIcon
              message="Permanent Deletions Warning"
              description={`This execution includes ${plan.deleteCount} DELETE operation(s). Rows will be permanently removed from ${plan.targetDatabase}.`}
              style={{ marginBottom: 20 }}
            />
          )}

          <div style={{ marginBottom: 24 }}>
            <Checkbox
              checked={confirmedRisk}
              onChange={(e) => setConfirmedRisk(e.target.checked)}
            >
              <Text strong>
                I have reviewed the plan, dry run simulation, and authorize the changes to {plan.targetDatabase}.
              </Text>
            </Checkbox>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(3)}>
              <ArrowLeftOutlined /> Back
            </Button>
            <Button
              type="primary"
              danger
              icon={<SyncOutlined />}
              disabled={!confirmedRisk}
              loading={executing}
              onClick={handleExecutePlan}
            >
              Execute Synchronization Now
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STEP 6: LIVE EXECUTION PROGRESS ================= */}
      {currentStep === 6 && (
        <Card title="Step 7: Synchronization in Progress" style={{ borderRadius: 8 }}>
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <Progress
              type="circle"
              percent={execution?.progressPercent || 0}
              status={
                execution?.status === 'Failed'
                  ? 'exception'
                  : execution?.status === 'Completed'
                  ? 'success'
                  : 'active'
              }
              size={140}
            />

            <Title level={4} style={{ marginTop: 20, marginBottom: 4 }}>
              Status: {execution?.status || 'Queued'}
            </Title>

            {execution?.currentTable && (
              <Paragraph type="secondary">
                Processing table: <Text strong className="font-mono">{execution.currentTable}</Text>
              </Paragraph>
            )}

            <Row gutter={[16, 16]} style={{ maxWidth: 640, margin: '24px auto 0 auto' }}>
              <Col span={6}>
                <Card size="small" style={{ background: '#f8fafc' }}>
                  <Statistic title="Completed" value={execution?.completedOperations || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#f0fdf4' }}>
                  <Statistic title="Total" value={execution?.totalOperations || 0} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fef2f2' }}>
                  <Statistic title="Failed" value={execution?.failedOperations || 0} valueStyle={{ color: '#dc2626' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fffbeb' }}>
                  <Statistic title="Skipped" value={execution?.skippedOperations || 0} valueStyle={{ color: '#d97706' }} />
                </Card>
              </Col>
            </Row>

            {execution?.status === 'Running' && (
              <div style={{ marginTop: 30 }}>
                <Button
                  danger
                  icon={<StopOutlined />}
                  loading={cancelling}
                  onClick={handleCancelExecution}
                >
                  Cancel Execution
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ================= STEP 7: RESULT & REVERSAL ================= */}
      {currentStep === 7 && execution && (
        <Card style={{ borderRadius: 8 }}>
          <Result
            status={
              execution.status === 'Completed'
                ? 'success'
                : execution.status === 'CompletedWithErrors'
                ? 'warning'
                : 'error'
            }
            title={
              execution.status === 'Completed'
                ? 'Synchronization Completed Successfully'
                : execution.status === 'CompletedWithErrors'
                ? 'Synchronization Completed with Errors'
                : 'Synchronization Failed'
            }
            subTitle={
              execution.errorMessage ||
              `Processed ${execution.completedOperations} of ${execution.totalOperations} operations on ${plan?.targetDatabase}.`
            }
            extra={[
              <Button
                type="primary"
                key="new-sync"
                onClick={() => {
                  setCurrentStep(0);
                  setPlan(null);
                  setExecution(null);
                  setSearchParams({});
                }}
              >
                Start Another Sync
              </Button>,
              <Button
                key="reversal"
                icon={<RollbackOutlined />}
                loading={creatingReversal}
                onClick={handleCreateReversalPlan}
              >
                Generate Reversal Plan (Rollback)
              </Button>,
              <Button
                key="audit"
                onClick={() => navigate('/audit-logs')}
              >
                View in Audit Logs
              </Button>,
            ]}
          />
        </Card>
      )}

      {/* Side-by-side Operation Diff Drawer */}
      <SyncDiffDrawer
        open={diffDrawerOpen}
        operation={selectedOperation}
        onClose={() => {
          setDiffDrawerOpen(false);
          setSelectedOperation(null);
        }}
        targetDatabaseName={targetDbName}
        sourceDatabaseName={sourceDbName}
      />
    </div>
  );
};
