import React from 'react';

interface TabConfig {
    id: string;
    label: string;
}

interface TabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <ul>
            {tabs.map(tab => (
                <li key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}>
                    {/* Using button for better accessibility and event handling */}
                    <button onClick={() => onTabChange(tab.id)}>
                        {tab.label}
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default Tabs; 