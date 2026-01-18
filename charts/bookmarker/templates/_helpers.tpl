{{/*
Expand the name of the chart.
*/}}
{{- define "bookmarker.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "bookmarker.fullname" -}}
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
{{- define "bookmarker.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "bookmarker.labels" -}}
helm.sh/chart: {{ include "bookmarker.chart" . }}
{{ include "bookmarker.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "bookmarker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "bookmarker.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "bookmarker.backend.labels" -}}
{{ include "bookmarker.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "bookmarker.backend.selectorLabels" -}}
{{ include "bookmarker.selectorLabels" . }}
app.kubernetes.io/component: backend
app: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "bookmarker.frontend.labels" -}}
{{ include "bookmarker.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "bookmarker.frontend.selectorLabels" -}}
{{ include "bookmarker.selectorLabels" . }}
app.kubernetes.io/component: frontend
app: frontend
{{- end }}

{{/*
PostgreSQL labels
*/}}
{{- define "bookmarker.postgresql.labels" -}}
{{ include "bookmarker.labels" . }}
app.kubernetes.io/component: database
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "bookmarker.postgresql.selectorLabels" -}}
{{ include "bookmarker.selectorLabels" . }}
app.kubernetes.io/component: database
app: postgres
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "bookmarker.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "bookmarker.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database connection URL
*/}}
{{- define "bookmarker.databaseUrl" -}}
{{- printf "postgresql://%s:$(DB_PASSWORD)@%s:5432/%s" .Values.postgresql.username (include "bookmarker.postgresql.serviceName" .) .Values.postgresql.database }}
{{- end }}

{{/*
Backend component name
*/}}
{{- define "bookmarker.backend.name" -}}
{{- printf "%sbackend" .Values.namePrefix }}
{{- end }}

{{/*
Frontend component name
*/}}
{{- define "bookmarker.frontend.name" -}}
{{- printf "%sfrontend" .Values.namePrefix }}
{{- end }}

{{/*
Backend service name
*/}}
{{- define "bookmarker.backend.serviceName" -}}
{{- printf "%sbackend-service" .Values.namePrefix }}
{{- end }}

{{/*
Frontend service name
*/}}
{{- define "bookmarker.frontend.serviceName" -}}
{{- printf "%sfrontend-service" .Values.namePrefix }}
{{- end }}

{{/*
PostgreSQL component name
*/}}
{{- define "bookmarker.postgresql.name" -}}
{{- printf "%spostgres" .Values.namePrefix }}
{{- end }}

{{/*
PostgreSQL service name
*/}}
{{- define "bookmarker.postgresql.serviceName" -}}
{{- printf "%spostgres-service" .Values.namePrefix }}
{{- end }}

{{/*
PostgreSQL PVC name
*/}}
{{- define "bookmarker.postgresql.pvcName" -}}
{{- printf "%spostgres-pvc" .Values.namePrefix }}
{{- end }}
