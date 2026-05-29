'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  PartnerDto,
  PartnerImportPreviewDto,
  PartnerImportResultDto,
  PartnerImportRowPreview,
  importPartnerBuyersSchema,
} from '@controle-fazendas/shared';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, getAccessToken, getApiUrl } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';

interface PartnerBuyerImportProps {
  farmId: string;
}

const ACTION_LABELS: Record<PartnerImportRowPreview['action'], string> = {
  create: 'Novo',
  update: 'Atualizar',
  skip: 'Ignorar',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  document: 'CPF/CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  phone2: 'Telefone 2',
  phone3: 'Telefone 3',
  address: 'Endereço',
  city: 'Cidade',
  state: 'UF',
  zipCode: 'CEP',
  ranchName: 'Fazenda',
  ranchCity: 'Cidade da fazenda',
  ranchState: 'UF da fazenda',
  ranchRegistration: 'Inscrição',
};

type ActionFilter = 'all' | 'create' | 'update' | 'skip';

export function PartnerBuyerImport({ farmId }: PartnerBuyerImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('5421');
  const [preview, setPreview] = useState<PartnerImportPreviewDto | null>(null);
  const [rows, setRows] = useState<PartnerImportRowPreview[]>([]);
  const [filter, setFilter] = useState<ActionFilter>('all');

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', farmId],
    queryFn: async () => {
      const { data } = await api.get<PartnerDto[]>(`/farms/${farmId}/partners`);
      return data;
    },
    enabled: !!farmId,
  });

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((row) => row.action === filter);
  }, [rows, filter]);

  const selectedCount = rows.filter((row) => row.selected).length;

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um PDF');
      const formData = new FormData();
      formData.append('file', file);
      if (password.trim()) formData.append('password', password.trim());

      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/farms/${farmId}/partners/import/preview`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          Array.isArray(payload.message) ? payload.message.join('. ') : payload.message,
        );
      }

      return (await response.json()) as PartnerImportPreviewDto;
    },
    onSuccess: (data) => {
      setPreview(data);
      setRows(data.rows);
      toast({
        title: 'PDF lido',
        description: `${data.rows.length} comprador(es) encontrado(s). Revise antes de importar.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao ler PDF',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = importPartnerBuyersSchema.parse({
        pdfPassword: password.trim() || undefined,
        rows: rows.map((row) => ({
          tempId: row.tempId,
          selected: row.selected,
          matchedPartnerId: row.matchedPartnerId,
          action: row.action,
          parsed: {
            name: row.parsed.name,
            document: row.parsed.document,
            email: row.parsed.email,
            phone: row.parsed.phone,
            phone2: row.parsed.phone2,
            phone3: row.parsed.phone3,
            address: row.parsed.address,
            city: row.parsed.city,
            state: row.parsed.state,
            zipCode: row.parsed.zipCode,
            ranchName: row.parsed.ranchName,
            ranchCity: row.parsed.ranchCity,
            ranchState: row.parsed.ranchState,
            ranchRegistration: row.parsed.ranchRegistration,
          },
        })),
      });

      const { data } = await api.post<PartnerImportResultDto>(
        `/farms/${farmId}/partners/import`,
        payload,
      );
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['partners', farmId] });
      toast({
        title: 'Importação concluída',
        description: `${result.created} criado(s), ${result.updated} atualizado(s), ${result.skipped} ignorado(s).`,
      });
      if (result.errors.length > 0) {
        toast({
          title: 'Erros na importação',
          description: result.errors.slice(0, 3).join(' · '),
          variant: 'destructive',
        });
      }
      setPreview(null);
      setRows([]);
      setFile(null);
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro na importação',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateRow = (tempId: string, patch: Partial<PartnerImportRowPreview>) => {
    setRows((current) =>
      current.map((row) => (row.tempId === tempId ? { ...row, ...patch } : row)),
    );
  };

  const setRowPartner = (tempId: string, partnerId: string | null) => {
    setRows((current) =>
      current.map((row) => {
        if (row.tempId !== tempId) return row;
        if (!partnerId) {
          return {
            ...row,
            matchedPartnerId: null,
            matchedPartnerName: null,
            matchType: null,
            action: 'create',
            fieldsToFill: [],
          };
        }
        const partner = partners.find((p) => p.id === partnerId);
        return {
          ...row,
          matchedPartnerId: partnerId,
          matchedPartnerName: partner?.name ?? null,
          action: 'update',
        };
      }),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar compradores (PDF)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Envie o relatório &quot;Relação de Compradores&quot; da Bula Remates. Compradores
          idênticos serão ignorados; campos vazios serão preenchidos após sua confirmação.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buyer-pdf">Arquivo PDF</Label>
            <Input
              id="buyer-pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyer-pdf-password">Senha do PDF</Label>
            <Input
              id="buyer-pdf-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="5421"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => previewMutation.mutate()}
          disabled={!file || previewMutation.isPending}
        >
          <Upload className="mr-2 h-4 w-4" />
          {previewMutation.isPending ? 'Lendo PDF…' : 'Gerar preview'}
        </Button>

        {preview && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{preview.document.title}</p>
              <p className="text-muted-foreground">
                {preview.document.buyerCount} comprador(es) identificado(s)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'create', 'update', 'skip'] as ActionFilter[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? 'default' : 'outline'}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all'
                    ? 'Todos'
                    : value === 'create'
                      ? 'Novos'
                      : value === 'update'
                        ? 'Atualizar'
                        : 'Ignorados'}
                </Button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 text-left">Sel.</th>
                    <th className="px-2 py-2 text-left">Nome (PDF)</th>
                    <th className="px-2 py-2 text-left">CPF/CNPJ</th>
                    <th className="px-2 py-2 text-left">Match</th>
                    <th className="px-2 py-2 text-left">Ação</th>
                    <th className="px-2 py-2 text-left">Campos a preencher</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.tempId} className="border-t align-top">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateRow(row.tempId, { selected: e.target.checked })}
                        />
                      </td>
                      <td className="px-2 py-2 font-medium">{row.parsed.name}</td>
                      <td className="px-2 py-2">{row.parsed.document ?? '—'}</td>
                      <td className="px-2 py-2">
                        <Select
                          value={row.matchedPartnerId ?? '__none__'}
                          onValueChange={(value) =>
                            setRowPartner(row.tempId, value === '__none__' ? null : value)
                          }
                        >
                          <SelectTrigger className="h-8 min-w-[180px]">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum (criar novo)</SelectItem>
                            {partners.map((partner) => (
                              <SelectItem key={partner.id} value={partner.id}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Select
                          value={row.action}
                          onValueChange={(value) =>
                            updateRow(row.tempId, {
                              action: value as PartnerImportRowPreview['action'],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="create">{ACTION_LABELS.create}</SelectItem>
                            <SelectItem value="update">{ACTION_LABELS.update}</SelectItem>
                            <SelectItem value="skip">{ACTION_LABELS.skip}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {row.fieldsToFill.length === 0
                          ? '—'
                          : row.fieldsToFill
                              .map((f) => FIELD_LABELS[f.field] ?? f.field)
                              .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedCount} linha(s) selecionada(s) para importação
              </p>
              <Button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={selectedCount === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importando…' : 'Importar selecionados'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
