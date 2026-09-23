#!/usr/bin/env python3
import time
import random
import sys
import os

# Add compiled stubs path
sys.path.append("/app/generated")
sys.path.append("/home/kami/sentinel-nexus/tools/mock_appliance/generated")

import grpc
import telemetry_pb2
import telemetry_pb2_grpc

class AmbientFlowGenerator:
    def __init__(self, nexus_endpoint="172.28.0.10:50051"):
        self.channel = grpc.insecure_channel(nexus_endpoint)
        self.stub = telemetry_pb2_grpc.TelemetryServiceStub(self.channel)

    def stream_ambient_batch(self, node_id, count=50, inject_uncertainty=True):
        def generate():
            vectors = []
            for _ in range(count):
                # 32-dim synthetic NetFlow features
                features = [random.gauss(0.0, 0.5) for _ in range(32)]
                
                # Active learning uncertainty window: [0.40, 0.60]
                if inject_uncertainty and random.random() < 0.20:
                    uncertainty = random.uniform(0.42, 0.58)
                    recon_loss = random.uniform(0.76, 0.92)
                    drop = True
                else:
                    uncertainty = random.uniform(0.01, 0.25)
                    recon_loss = random.uniform(0.05, 0.30)
                    drop = False

                vectors.append(telemetry_pb2.CandidateVector(
                    event_id=random.randint(100000, 999999),
                    timestamp_ns=time.time_ns(),
                    features=features,
                    inference_uncertainty=uncertainty,
                    autoencoder_recon_loss=recon_loss,
                    triggered_kernel_drop=drop
                ))
            yield telemetry_pb2.FeatureVectorStream(node_id=node_id, vectors=vectors)

        try:
            summary = self.stub.StreamCandidateVectors(generate())
            return summary.routed_to_forge
        except Exception as e:
            return 0