{{/*
Expand the name of the chart.
*/}}
{{- define "maki.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "maki.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "maki.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "maki.labels" -}}
helm.sh/chart: {{ include "maki.chart" . }}
{{ include "maki.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "maki.selectorLabels" -}}
app.kubernetes.io/name: {{ include "maki.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "maki.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "maki.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
URL-encode credentials for URI userinfo. Sprig urlquery uses form escaping,
so spaces become +; in userinfo they must be %20 to preserve credentials.
*/}}
{{- define "maki.urlencodeUserinfo" -}}
{{- . | urlquery | replace "+" "%20" -}}
{{- end }}

{{/*
API component common labels
*/}}
{{- define "maki.api.labels" -}}
helm.sh/chart: {{ include "maki.chart" . }}
{{ include "maki.api.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: api
{{- end }}

{{/*
API component selector labels
*/}}
{{- define "maki.api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "maki.name" . }}-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web component common labels
*/}}
{{- define "maki.web.labels" -}}
helm.sh/chart: {{ include "maki.chart" . }}
{{ include "maki.web.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Web component selector labels
*/}}
{{- define "maki.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "maki.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
