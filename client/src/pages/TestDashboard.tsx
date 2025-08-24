import React from "react";
import { Card } from "@/components/ui/card";

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Zaldo CRM</h1>
            <p className="text-sm text-gray-500">Testmodus aktiv</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg font-medium">
              📊 Dashboard
            </div>
            <div className="p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              👥 Klienter
            </div>
            <div className="p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              📋 Oppgaver
            </div>
            <div className="p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              ⏰ Tid
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              🎉 Du er nå inne i systemet! Testmodus er aktivert.
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktive oppgaver</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-xs text-gray-500">Pågående</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  ✅
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Forsinkede</p>
                  <p className="text-2xl font-bold text-amber-600">3</p>
                  <p className="text-xs text-gray-500">Krever handling</p>
                </div>
                <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  ⚠️
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Timer/uke</p>
                  <p className="text-2xl font-bold text-gray-900">37t</p>
                  <p className="text-xs text-gray-500">Registrert</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  🕐
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Klienter</p>
                  <p className="text-2xl font-bold text-gray-900">48</p>
                  <p className="text-xs text-gray-500">Totalt</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  👥
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hurtighandlinger</h3>
              <div className="space-y-3">
                <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="font-medium text-blue-900">📝 Legg til ny klient</div>
                  <div className="text-sm text-blue-700">Opprett en ny klientprofil</div>
                </button>
                <button className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="font-medium text-green-900">✅ Registrer tid</div>
                  <div className="text-sm text-green-700">Logg arbeidstimer</div>
                </button>
                <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="font-medium text-purple-900">🔍 AML/KYC sjekk</div>
                  <div className="text-sm text-purple-700">Utfør kundeidentifisering</div>
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Siste aktivitet</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">MVA-rapport ferdigstilt</div>
                  <div className="text-xs text-gray-500">Acme AS - 2 timer siden</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Ny klient registrert</div>
                  <div className="text-xs text-gray-500">Bergen Handel - 1 dag siden</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Årsoppgjør startet</div>
                  <div className="text-xs text-gray-500">Stavanger Tech - 2 dager siden</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}