package com.cnip.nms.dto;

import java.util.List;
import java.util.Map;

public class TopologyGraphDto {
    private List<NodeDto> nodes;
    private List<EdgeDto> edges;

    public TopologyGraphDto() {}

    public TopologyGraphDto(List<NodeDto> nodes, List<EdgeDto> edges) {
        this.nodes = nodes;
        this.edges = edges;
    }

    public List<NodeDto> getNodes() { return nodes; }
    public void setNodes(List<NodeDto> nodes) { this.nodes = nodes; }
    public List<EdgeDto> getEdges() { return edges; }
    public void setEdges(List<EdgeDto> edges) { this.edges = edges; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private List<NodeDto> nodes;
        private List<EdgeDto> edges;

        public Builder nodes(List<NodeDto> nodes) { this.nodes = nodes; return this; }
        public Builder edges(List<EdgeDto> edges) { this.edges = edges; return this; }
        public TopologyGraphDto build() { return new TopologyGraphDto(nodes, edges); }
    }

    public static class NodeDto {
        private String id;
        private String type;
        private Position position;
        private Map<String, Object> data;

        public NodeDto() {}

        public NodeDto(String id, String type, Position position, Map<String, Object> data) {
            this.id = id;
            this.type = type;
            this.position = position;
            this.data = data;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Position getPosition() { return position; }
        public void setPosition(Position position) { this.position = position; }
        public Map<String, Object> getData() { return data; }
        public void setData(Map<String, Object> data) { this.data = data; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String id;
            private String type;
            private Position position;
            private Map<String, Object> data;

            public Builder id(String id) { this.id = id; return this; }
            public Builder type(String type) { this.type = type; return this; }
            public Builder position(Position position) { this.position = position; return this; }
            public Builder data(Map<String, Object> data) { this.data = data; return this; }
            public NodeDto build() { return new NodeDto(id, type, position, data); }
        }
    }

    public static class Position {
        private double x;
        private double y;

        public Position() {}

        public Position(double x, double y) {
            this.x = x;
            this.y = y;
        }

        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
    }

    public static class EdgeDto {
        private String id;
        private String source;
        private String target;
        private String label;
        private boolean animated;
        private Map<String, Object> style;
        private Map<String, Object> data;

        public EdgeDto() {}

        public EdgeDto(String id, String source, String target, String label, boolean animated, Map<String, Object> style, Map<String, Object> data) {
            this.id = id;
            this.source = source;
            this.target = target;
            this.label = label;
            this.animated = animated;
            this.style = style;
            this.data = data;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getTarget() { return target; }
        public void setTarget(String target) { this.target = target; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public boolean isAnimated() { return animated; }
        public void setAnimated(boolean animated) { this.animated = animated; }
        public Map<String, Object> getStyle() { return style; }
        public void setStyle(Map<String, Object> style) { this.style = style; }
        public Map<String, Object> getData() { return data; }
        public void setData(Map<String, Object> data) { this.data = data; }

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private String id;
            private String source;
            private String target;
            private String label;
            private boolean animated;
            private Map<String, Object> style;
            private Map<String, Object> data;

            public Builder id(String id) { this.id = id; return this; }
            public Builder source(String source) { this.source = source; return this; }
            public Builder target(String target) { this.target = target; return this; }
            public Builder label(String label) { this.label = label; return this; }
            public Builder animated(boolean animated) { this.animated = animated; return this; }
            public Builder style(Map<String, Object> style) { this.style = style; return this; }
            public Builder data(Map<String, Object> data) { this.data = data; return this; }
            public EdgeDto build() { return new EdgeDto(id, source, target, label, animated, style, data); }
        }
    }
}
